package com.tastybitesmobile.display

import android.app.Presentation
import android.content.Context
import android.graphics.Color
import android.graphics.Typeface
import android.hardware.display.DisplayManager
import android.os.Bundle
import android.util.TypedValue
import android.view.Display
import android.view.Gravity
import android.view.ViewGroup
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap

/**
 * Customer-facing secondary display for dual-screen POS tablets.
 *
 * AutoReplyPrint (Caysn 80mm SDK) only drives the thermal printer — it has no
 * customer LCD / VFD APIs. The rear/small screen is a second Android Display;
 * we show totals via [Presentation] on that display.
 */
class CustomerDisplayModule(
  private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

  private var presentation: CustomerPresentation? = null

  override fun getName(): String = NAME

  override fun invalidate() {
    UiThreadUtil.runOnUiThread {
      dismissPresentation()
    }
    super.invalidate()
  }

  @ReactMethod
  fun getDisplays(promise: Promise) {
    try {
      val dm =
        reactContext.getSystemService(Context.DISPLAY_SERVICE) as? DisplayManager
      val list: WritableArray = Arguments.createArray()
      if (dm == null) {
        promise.resolve(list)
        return
      }
      for (display in dm.displays) {
        val map: WritableMap = Arguments.createMap()
        map.putInt("displayId", display.displayId)
        map.putString("name", display.name ?: "Display ${display.displayId}")
        map.putBoolean("isDefault", display.displayId == Display.DEFAULT_DISPLAY)
        map.putInt("flags", display.flags)
        map.putInt("state", display.state)
        list.pushMap(map)
      }
      promise.resolve(list)
    } catch (err: Exception) {
      promise.reject("DISPLAY_LIST_FAILED", err.message, err)
    }
  }

  @ReactMethod
  fun isAvailable(promise: Promise) {
    try {
      val secondary = findCustomerDisplay()
      val map = Arguments.createMap()
      map.putBoolean("available", secondary != null)
      if (secondary != null) {
        map.putInt("displayId", secondary.displayId)
        map.putString("name", secondary.name ?: "Customer display")
      }
      promise.resolve(map)
    } catch (err: Exception) {
      promise.reject("DISPLAY_CHECK_FAILED", err.message, err)
    }
  }

  @ReactMethod
  fun show(payload: ReadableMap, promise: Promise) {
    UiThreadUtil.runOnUiThread {
      try {
        val display =
          findCustomerDisplay()
            ?: run {
              promise.resolve(
                Arguments.createMap().apply {
                  putBoolean("success", false)
                  putBoolean("available", false)
                  putString(
                    "error",
                    "No secondary customer display found. Use a dual-screen POS tablet (not emulator).",
                  )
                },
              )
              return@runOnUiThread
            }

        val activity = reactContext.currentActivity
        val ctx = activity ?: reactContext
        val existing = presentation
        if (existing == null || existing.display.displayId != display.displayId) {
          dismissPresentation()
          presentation = CustomerPresentation(ctx, display)
          presentation?.show()
        }
        presentation?.update(payload)
        val map = Arguments.createMap()
        map.putBoolean("success", true)
        map.putBoolean("available", true)
        map.putInt("displayId", display.displayId)
        promise.resolve(map)
      } catch (err: Exception) {
        promise.reject("DISPLAY_SHOW_FAILED", err.message, err)
      }
    }
  }

  @ReactMethod
  fun clear(promise: Promise) {
    UiThreadUtil.runOnUiThread {
      try {
        presentation?.showIdle()
        val map = Arguments.createMap()
        map.putBoolean("success", true)
        promise.resolve(map)
      } catch (err: Exception) {
        promise.reject("DISPLAY_CLEAR_FAILED", err.message, err)
      }
    }
  }

  @ReactMethod
  fun dismiss(promise: Promise) {
    UiThreadUtil.runOnUiThread {
      try {
        dismissPresentation()
        val map = Arguments.createMap()
        map.putBoolean("success", true)
        promise.resolve(map)
      } catch (err: Exception) {
        promise.reject("DISPLAY_DISMISS_FAILED", err.message, err)
      }
    }
  }

  private fun dismissPresentation() {
    try {
      presentation?.dismiss()
    } catch (_: Exception) {
      // ignore
    }
    presentation = null
  }

  private fun findCustomerDisplay(): Display? {
    val dm =
      reactContext.getSystemService(Context.DISPLAY_SERVICE) as? DisplayManager
        ?: return null
    val displays = dm.displays
    // Prefer a non-default display that looks like a presentation panel
    val presentation =
      displays.firstOrNull {
        it.displayId != Display.DEFAULT_DISPLAY &&
          (it.flags and Display.FLAG_PRESENTATION) != 0 &&
          it.state == Display.STATE_ON
      }
    if (presentation != null) return presentation

    return displays.firstOrNull {
      it.displayId != Display.DEFAULT_DISPLAY && it.state != Display.STATE_OFF
    }
  }

  companion object {
    const val NAME = "CustomerDisplay"
  }
}

private class CustomerPresentation(
  context: Context,
  display: Display,
) : Presentation(context, display) {

  private lateinit var brandView: TextView
  private lateinit var titleView: TextView
  private lateinit var linesView: TextView
  private lateinit var totalLabelView: TextView
  private lateinit var totalView: TextView
  private lateinit var footerView: TextView

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    val root =
      LinearLayout(context).apply {
        orientation = LinearLayout.VERTICAL
        setBackgroundColor(Color.parseColor("#1A1A1A"))
        setPadding(dp(28), dp(28), dp(28), dp(28))
        layoutParams =
          ViewGroup.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT,
          )
      }

    brandView =
      TextView(context).apply {
        text = "TASTY BITES"
        setTextColor(Color.parseColor("#F97316"))
        setTextSize(TypedValue.COMPLEX_UNIT_SP, 18f)
        typeface = Typeface.DEFAULT_BOLD
        gravity = Gravity.CENTER_HORIZONTAL
      }

    titleView =
      TextView(context).apply {
        text = "Your order"
        setTextColor(Color.WHITE)
        setTextSize(TypedValue.COMPLEX_UNIT_SP, 22f)
        typeface = Typeface.DEFAULT_BOLD
        gravity = Gravity.CENTER_HORIZONTAL
        setPadding(0, dp(12), 0, dp(8))
      }

    linesView =
      TextView(context).apply {
        text = ""
        setTextColor(Color.parseColor("#D4D4D4"))
        setTextSize(TypedValue.COMPLEX_UNIT_SP, 16f)
        setLineSpacing(0f, 1.25f)
      }

    val scroll =
      ScrollView(context).apply {
        layoutParams =
          LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            0,
            1f,
          )
        addView(
          linesView,
          ViewGroup.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT,
          ),
        )
      }

    totalLabelView =
      TextView(context).apply {
        text = "TOTAL"
        setTextColor(Color.parseColor("#A3A3A3"))
        setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f)
        gravity = Gravity.CENTER_HORIZONTAL
        setPadding(0, dp(16), 0, dp(4))
      }

    totalView =
      TextView(context).apply {
        text = "$0.00"
        setTextColor(Color.WHITE)
        setTextSize(TypedValue.COMPLEX_UNIT_SP, 42f)
        typeface = Typeface.DEFAULT_BOLD
        gravity = Gravity.CENTER_HORIZONTAL
      }

    footerView =
      TextView(context).apply {
        text = "Thank you"
        setTextColor(Color.parseColor("#A3A3A3"))
        setTextSize(TypedValue.COMPLEX_UNIT_SP, 15f)
        gravity = Gravity.CENTER_HORIZONTAL
        setPadding(0, dp(16), 0, 0)
      }

    root.addView(brandView)
    root.addView(titleView)
    root.addView(scroll)
    root.addView(totalLabelView)
    root.addView(totalView)
    root.addView(footerView)
    setContentView(root)
    showIdle()
  }

  fun update(payload: ReadableMap) {
    val brand = payload.optString("brand", "TASTY BITES")
    val title = payload.optString("title", "Your order")
    val totalLabel = payload.optString("totalLabel", "TOTAL")
    val totalText = payload.optString("totalText", "$0.00")
    val footer = payload.optString("footer", "Thank you")
    val mode = payload.optString("mode", "cart")

    brandView.text = brand
    titleView.text = title
    totalLabelView.text = totalLabel
    totalView.text = totalText
    footerView.text = footer

    val sb = StringBuilder()
    if (payload.hasKey("lines") && !payload.isNull("lines")) {
      val lines: ReadableArray = payload.getArray("lines")!!
      for (i in 0 until lines.size()) {
        val line = lines.getMap(i) ?: continue
        val qty = if (line.hasKey("qty")) line.getInt("qty") else 1
        val name = line.optString("name", "Item")
        val price = line.optString("priceText", "")
        sb.append("$qty × $name")
        if (price.isNotBlank()) sb.append("    $price")
        sb.append('\n')
      }
    }
    if (sb.isEmpty() && mode == "idle") {
      linesView.text = "Welcome"
    } else {
      linesView.text = sb.toString().trimEnd()
    }
  }

  fun showIdle() {
    brandView.text = "TASTY BITES"
    titleView.text = "Welcome"
    linesView.text = ""
    totalLabelView.text = ""
    totalView.text = ""
    footerView.text = "Please wait for your order"
  }

  private fun dp(value: Int): Int =
    TypedValue
      .applyDimension(
        TypedValue.COMPLEX_UNIT_DIP,
        value.toFloat(),
        context.resources.displayMetrics,
      ).toInt()
}

private fun ReadableMap.optString(key: String, default: String): String {
  if (!hasKey(key) || isNull(key)) return default
  return getString(key) ?: default
}
