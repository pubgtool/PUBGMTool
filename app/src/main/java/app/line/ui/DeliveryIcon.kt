package app.line.ui

import android.content.Context
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Path
import android.view.View

class DeliveryIcon(context: Context) : View(context) {
    private val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE; strokeWidth = 1.5f; strokeCap = Paint.Cap.ROUND; strokeJoin = Paint.Join.ROUND }
    private val tick = Path().apply { moveTo(2f, 8f); lineTo(5f, 11f); lineTo(12f, 3f) }
    var status: String = "queued"
        set(value) { if (field != value) { field = value; invalidate() } }
    var tint: Int = 0xFFBBBBBB.toInt()
        set(value) { field = value; invalidate() }
    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas); paint.color = tint
        canvas.save(); canvas.translate(0f, (height - width * 0.7f) / 2); canvas.scale(width / 22f, width / 22f)
        when (status) {
            "delivered" -> { canvas.drawPath(tick, paint); canvas.translate(7f, 0f); canvas.drawPath(tick, paint) }
            "sent" -> { canvas.translate(4f, 0f); canvas.drawPath(tick, paint) }
            "failed" -> { canvas.drawCircle(11f, 7f, 5f, paint); canvas.drawLine(11f, 3.5f, 11f, 7.5f, paint); canvas.drawPoint(11f, 10f, paint) }
            else -> { canvas.drawCircle(11f, 7f, 5f, paint); canvas.drawLine(11f, 7f, 11f, 3.5f, paint); canvas.drawLine(11f, 7f, 14f, 8.5f, paint) }
        }
        canvas.restore()
    }
}
