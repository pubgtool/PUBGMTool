package app.line.push

import android.content.Context
import org.unifiedpush.android.connector.UnifiedPush
import java.net.URI

object PushConfiguration {
    internal const val INSTANCE = "line-push"

    private const val PREFERENCES = "line-push"
    private const val SELECTED_DISTRIBUTOR = "selected_distributor"
    private const val ENDPOINT = "endpoint"
    private const val DISTRIBUTOR_LABEL = "Line"

    fun isConfigured(ctx: Context): Boolean {
        val context = ctx.applicationContext
        val selected = selectedDistributor(context) ?: return false
        return selected in distributorPackages(context) && storedEndpoint(context) != null
    }

    fun status(ctx: Context): String? {
        val context = ctx.applicationContext
        val selected = selectedDistributor(context)
            ?: return "No UnifiedPush distributor selected"
        if (selected !in distributorPackages(context)) {
            return "Selected UnifiedPush distributor is unavailable"
        }
        return if (storedEndpoint(context) == null) {
            "UnifiedPush registration pending"
        } else {
            "UnifiedPush endpoint configured"
        }
    }

    fun distributors(ctx: Context): List<Pair<String, String>> {
        val context = ctx.applicationContext
        return distributorPackages(context).map { packageName ->
            val label = runCatching {
                val info = context.packageManager.getApplicationInfo(packageName, 0)
                context.packageManager.getApplicationLabel(info).toString()
            }.getOrDefault(packageName)
            packageName to label
        }
    }

    fun selectDistributor(ctx: Context, packageName: String) {
        val context = ctx.applicationContext
        if (packageName !in distributorPackages(context)) return

        val previous = selectedDistributor(context)
        if (previous != packageName && previous != null) {
            runCatching { UnifiedPush.unregister(context, INSTANCE) }
        }
        if (runCatching { UnifiedPush.saveDistributor(context, packageName) }.isFailure) return
        preferences(context).edit()
            .putString(SELECTED_DISTRIBUTOR, packageName)
            .remove(ENDPOINT)
            .apply()
        requestRegistration(context)
    }

    fun requestRegistration(ctx: Context) {
        val context = ctx.applicationContext
        val selected = selectedDistributor(context) ?: return
        if (selected !in distributorPackages(context)) return

        runCatching {
            if (runCatching { UnifiedPush.getAckDistributor(context) }.getOrNull() != selected) {
                UnifiedPush.saveDistributor(context, selected)
            }
            UnifiedPush.register(context, INSTANCE, DISTRIBUTOR_LABEL)
            preferences(context).edit().putString(SELECTED_DISTRIBUTOR, selected).apply()
        }
    }

    suspend fun endpoint(ctx: Context): String? = storedEndpoint(ctx.applicationContext)

    fun forget(ctx: Context) {
        val context = ctx.applicationContext
        preferences(context).edit().clear().apply()
        runCatching { UnifiedPush.removeDistributor(context) }
    }

    internal fun reRegisterIfSelected(ctx: Context) {
        val context = ctx.applicationContext
        preferences(context).edit()
            .remove("project_id")
            .remove("project_number")
            .remove("mobilesdk_app_id")
            .remove("api_key")
            .remove("registration_token")
            .apply()
        requestRegistration(context)
    }

    internal fun rememberEndpoint(ctx: Context, endpoint: String): Boolean {
        val context = ctx.applicationContext
        val safeEndpoint = validateEndpoint(endpoint)
        val edit = preferences(context).edit()
        if (safeEndpoint == null) {
            edit.remove(ENDPOINT)
        } else {
            edit.putString(ENDPOINT, safeEndpoint)
        }
        edit.apply()
        return safeEndpoint != null
    }

    internal fun forgetEndpoint(ctx: Context) {
        preferences(ctx.applicationContext).edit().remove(ENDPOINT).apply()
    }

    internal fun validateEndpoint(value: String?): String? {
        if (value.isNullOrBlank() || value.length > 4096 || value.any(Char::isWhitespace)) return null
        val uri = runCatching { URI(value) }.getOrNull() ?: return null
        if (!uri.scheme.equals("https", ignoreCase = true) || uri.host.isNullOrBlank()) return null
        if (uri.rawUserInfo != null || uri.rawQuery != null || uri.rawFragment != null) return null
        if (uri.port == 0 || uri.port !in -1..65535) return null
        return uri.toASCIIString()
    }

    private fun storedEndpoint(context: Context): String? {
        val prefs = preferences(context)
        val stored = prefs.getString(ENDPOINT, null)
        val safeEndpoint = validateEndpoint(stored)
        if (stored != null && safeEndpoint == null) prefs.edit().remove(ENDPOINT).apply()
        return safeEndpoint
    }

    private fun selectedDistributor(context: Context): String? {
        preferences(context).getString(SELECTED_DISTRIBUTOR, null)
            ?.takeIf(String::isNotBlank)
            ?.let { return it }
        return runCatching { UnifiedPush.getAckDistributor(context) }
            .getOrNull()
            ?.takeIf(String::isNotBlank)
            ?.also { preferences(context).edit().putString(SELECTED_DISTRIBUTOR, it).apply() }
    }

    private fun distributorPackages(context: Context): List<String> =
        runCatching { UnifiedPush.getDistributors(context) }.getOrDefault(emptyList())

    private fun preferences(context: Context) = context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)
}
