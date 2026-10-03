package app.line.i18n

import android.content.Context
import android.content.DialogInterface

object UiDialogs {
    const val BUTTON_POSITIVE = android.app.AlertDialog.BUTTON_POSITIVE

    class Builder(private val languageContext: Context) : android.app.AlertDialog.Builder(languageContext) {
        private fun localized(value: CharSequence?) = value?.let { UiStrings.translate(languageContext, it.toString()) }
        override fun setTitle(title: CharSequence?): android.app.AlertDialog.Builder = super.setTitle(localized(title))
        override fun setMessage(message: CharSequence?): android.app.AlertDialog.Builder = super.setMessage(localized(message))
        override fun setPositiveButton(text: CharSequence?, listener: DialogInterface.OnClickListener?): android.app.AlertDialog.Builder = super.setPositiveButton(localized(text), listener)
        override fun setNegativeButton(text: CharSequence?, listener: DialogInterface.OnClickListener?): android.app.AlertDialog.Builder = super.setNegativeButton(localized(text), listener)
        override fun setItems(items: Array<out CharSequence>?, listener: DialogInterface.OnClickListener?): android.app.AlertDialog.Builder =
            super.setItems(items?.map { localized(it) ?: "" }?.toTypedArray(), listener)
        override fun setSingleChoiceItems(items: Array<out CharSequence>?, checkedItem: Int, listener: DialogInterface.OnClickListener?): android.app.AlertDialog.Builder =
            super.setSingleChoiceItems(items?.map { localized(it) ?: "" }?.toTypedArray(), checkedItem, listener)
    }
}
