package app.line.i18n

import android.content.Context
import android.content.res.Configuration
import app.line.R
import java.util.Locale

object LocalePreferences {
    private const val PREFERENCES = "line-ui"
    private const val LANGUAGE_KEY = "language"

    fun language(context: Context): String = when (
        context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE).getString(LANGUAGE_KEY, "ru")
    ) {
        "en" -> "en"
        "kk" -> "kk"
        else -> "ru"
    }

    fun setLanguage(context: Context, language: String) {
        val supported = when (language.lowercase(Locale.ROOT)) {
            "en", "en-us", "en-gb" -> "en"
            "kk", "kk-kz" -> "kk"
            else -> "ru"
        }
        context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)
            .edit().putString(LANGUAGE_KEY, supported).apply()
    }

    fun wrap(context: Context): Context {
        val locale = locale(context)
        val configuration = Configuration(context.resources.configuration).apply {
            setLocale(locale)
            setLayoutDirection(locale)
        }
        return context.createConfigurationContext(configuration)
    }

    fun apply(context: Context): Context = wrap(context)

    fun locale(context: Context): Locale = Locale.forLanguageTag(language(context))

    fun languageName(context: Context, language: String = language(context)): String = context.getString(
        when (language) {
            "en" -> R.string.language_english
            "kk" -> R.string.language_kazakh
            else -> R.string.language_russian
        }
    )
}
