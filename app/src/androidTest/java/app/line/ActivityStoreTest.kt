package app.line

import android.database.sqlite.SQLiteDatabase
import androidx.test.platform.app.InstrumentationRegistry
import app.line.crypto.SecureStore
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.nio.charset.StandardCharsets
import java.util.UUID

class ActivityStoreTest {
    private val context get() = InstrumentationRegistry.getInstrumentation().targetContext

    @Test fun activityUpdatesKeepTheirTimelineAndEncryptPeerDetails() {
        val peer = "activity-peer-${UUID.randomUUID()}"
        val otherPeer = "activity-peer-${UUID.randomUUID()}"
        val incomingId = "call:${UUID.randomUUID()}"
        val outgoingId = "call:${UUID.randomUUID()}"
        val messageId = "message:${UUID.randomUUID()}"
        val storedPeer = peer

        SecureStore(context).use { store ->
            store.markEventsRead()
            store.recordEvent(incomingId, "call_incoming", "connecting", peer, listOf(peer, otherPeer))
            val original = store.events(kind = "call_incoming").single { it.id == incomingId }
            store.markEventsRead()
            assertEquals(0, store.unreadEventCount())

            store.recordEvent(incomingId, "call_incoming", "missed", peer, listOf(otherPeer))
            val updated = store.events(kind = "call_incoming").single { it.id == incomingId }
            assertEquals(original.sequence, updated.sequence)
            assertEquals(original.createdAt, updated.createdAt)
            assertTrue(updated.read)
            assertEquals("missed", updated.state)
            assertEquals(listOf(otherPeer), updated.members)

            store.recordEvent(outgoingId, "call_outgoing", "failed", otherPeer)
            store.recordEvent(messageId, "message", "received", peer)
            assertEquals(2, store.unreadEventCount())
            val newest = store.events().take(3)
            assertEquals(listOf(messageId, outgoingId, incomingId), newest.map { it.id })
            assertEquals(outgoingId, store.events(before = newest.first().sequence, limit = 1).single().id)
            assertEquals(
                listOf(outgoingId, incomingId),
                store.recentCalls().filter { it.id == incomingId || it.id == outgoingId }.map { it.id },
            )
            assertFalse(store.recentCalls().any { it.id == messageId })
            assertEquals(1, store.events(kind = "message").count { it.id == messageId })

            try {
                store.recordEvent(incomingId, "call_incoming", "missed", otherPeer)
                throw AssertionError("An event id must not be reassigned to another peer")
            } catch (_: IllegalStateException) {
                // Existing event ownership is immutable.
            }
        }

        SQLiteDatabase.openDatabase(
            context.getDatabasePath("line-secure-store.db").path,
            null,
            SQLiteDatabase.OPEN_READONLY,
        ).use { database ->
            database.query("app_events", arrayOf("details"), "id=?", arrayOf(messageId), null, null, null).use { cursor ->
                assertTrue(cursor.moveToFirst())
                val encrypted = String(cursor.getBlob(0), StandardCharsets.ISO_8859_1)
                assertFalse(encrypted.contains(storedPeer))
            }
        }
    }

    @Test fun encryptedSearchPagesMatchesAndExcludesDeletedMessages() {
        val peer = "search-peer-${UUID.randomUUID()}"
        val otherPeer = "search-peer-${UUID.randomUUID()}"
        val deletedId = "search-deleted-${UUID.randomUUID()}"

        SecureStore(context).use { store ->
            repeat(45) { index ->
                store.saveMessage(peer, "search-match-${UUID.randomUUID()}", "Find me result $index", true, "sent")
            }
            store.saveMessage(peer, deletedId, "Find me deleted", false, "received")
            store.recordEvent("message:$deletedId", "message", "received", peer)
            store.deleteMessage(deletedId)
            store.saveMessage(otherPeer, "search-other-${UUID.randomUUID()}", "Find me elsewhere", false, "received")

            val first = store.searchMessages("  fInD mE  ", limit = 200, peer = peer)
            assertEquals(40, first.items.size)
            assertTrue(first.hasMore)
            assertNotNull(first.nextCursor)
            assertTrue(first.items.zipWithNext().all { (newer, older) -> newer.sequence > older.sequence })
            assertTrue(first.items.all { it.peer == peer })

            val second = store.searchMessages("find me", before = first.nextCursor, peer = peer)
            assertEquals(5, second.items.size)
            assertFalse(second.hasMore)
            assertTrue(second.items.none { it.id == deletedId })
            assertEquals(1, store.searchMessages("find me", peer = otherPeer).items.size)
            assertFalse(store.events(kind = "message").any { it.id == "message:$deletedId" })

            try {
                store.searchMessages("x")
                throw AssertionError("Short search queries must be rejected")
            } catch (_: IllegalArgumentException) {
                // The minimum length avoids broad scans for a one-character query.
            }
            try {
                store.searchMessages("x".repeat(129))
                throw AssertionError("Oversized search queries must be rejected")
            } catch (_: IllegalArgumentException) {
                // Search queries have a bounded maximum length.
            }
        }
    }

    @Test fun searchCanContinueAfterTheBoundedEncryptedScanFindsNoMatch() {
        val peer = "scan-peer-${UUID.randomUUID()}"
        val targetId = "scan-target-${UUID.randomUUID()}"

        SecureStore(context).use { store ->
            store.saveMessage(peer, targetId, "An older searchable beacon", false, "received")
            repeat(200) { index ->
                store.saveMessage(peer, "scan-${UUID.randomUUID()}", "Unrelated $index", false, "received")
            }

            val first = store.searchMessages("searchable", peer = peer)
            assertTrue(first.items.isEmpty())
            assertTrue(first.hasMore)
            assertNotNull(first.nextCursor)

            val next = store.searchMessages("searchable", before = first.nextCursor, peer = peer)
            assertEquals(listOf(targetId), next.items.map { it.id })
            assertFalse(next.hasMore)
        }
    }

    @Test fun clearingConversationRemovesItsMessageEventsButKeepsCallHistory() {
        val peer = "clear-peer-${UUID.randomUUID()}"
        val otherPeer = "clear-peer-${UUID.randomUUID()}"
        val messageId = "clear-message-${UUID.randomUUID()}"
        val callId = "call:${UUID.randomUUID()}"

        SecureStore(context).use { store ->
            store.saveMessage(peer, messageId, "Clear this conversation", false, "received")
            store.recordEvent("message:$messageId", "message", "received", peer)
            store.recordEvent(callId, "call_incoming", "rejected", peer)
            store.recordEvent("message:${UUID.randomUUID()}", "message", "received", otherPeer)

            store.clearConversation(peer)

            assertFalse(store.events(kind = "message").any { it.peer == peer })
            assertTrue(store.events(kind = "message").any { it.peer == otherPeer })
            assertTrue(store.recentCalls().any { it.id == callId })

            store.clearEvents()
            assertTrue(store.events().isEmpty())
            assertEquals(0, store.unreadEventCount())
        }
    }
}
