package app.line

import androidx.test.platform.app.InstrumentationRegistry
import app.line.push.PushConfiguration
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Assume.assumeTrue
import org.junit.Test

class UnifiedPushTest {
    private val context get() = InstrumentationRegistry.getInstrumentation().targetContext

    @Test fun distributorListContainsPackageAndHumanLabel() {
        PushConfiguration.distributors(context).forEach { (packageName, label) ->
            assertTrue(packageName.isNotBlank())
            assertTrue(label.isNotBlank())
        }
    }

    @Test fun endpointValidationRequiresAnUnadornedHttpsUrl() {
        assertEquals("https://push.example/up/topic", PushConfiguration.validateEndpoint("https://push.example/up/topic"))
        assertEquals(null, PushConfiguration.validateEndpoint("http://push.example/up/topic"))
        assertEquals(null, PushConfiguration.validateEndpoint("https://user@push.example/up/topic"))
        assertEquals(null, PushConfiguration.validateEndpoint("https://push.example/up/topic?token=x"))
        assertEquals(null, PushConfiguration.validateEndpoint("https://push.example/up/topic#fragment"))
    }

    @Test fun statusNeverContainsTheStoredEndpoint() {
        val endpoint = runBlocking { PushConfiguration.endpoint(context) }
        if (endpoint != null) assertFalse(PushConfiguration.status(context).orEmpty().contains(endpoint))
    }

    @Test fun noInstalledDistributorDoesNotCrashRegistrationOrExposeAnEndpoint() {
        assumeTrue("Run this case on a device without a UnifiedPush distributor", PushConfiguration.distributors(context).isEmpty())

        PushConfiguration.requestRegistration(context)
        assertFalse(PushConfiguration.isConfigured(context))
        assertNotNull(PushConfiguration.status(context))
        val endpoint = runBlocking { PushConfiguration.endpoint(context) }
        if (endpoint != null) assertFalse(PushConfiguration.status(context).orEmpty().contains(endpoint))
    }
}
