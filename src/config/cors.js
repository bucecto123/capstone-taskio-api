import { WHITELIST_DOMAINS } from '~/utils/constants'
import { env } from '~/config/environment'
import { ForbiddenErrorResponse } from '~/core/error.response'

// Cấu hình CORS Option trong dự án thực tế (Video số 62 trong chuỗi MERN Stack Pro)
export const corsOptions = {
  origin: function (origin, callback) {
    // Same-origin requests không có Origin header (browser không gửi)
    // Ví dụ: frontend và API cùng domain qua CloudFront path-based routing
    if (!origin) {
      return callback(null, true)
    }

    // Nếu môi trường là local dev thì cho qua luôn
    if (env.BUILD_MODE === 'dev') {
      return callback(null, true)
    }

    // Kiểm tra xem origin có phải là domain được chấp nhận hay không
    if (WHITELIST_DOMAINS.includes(origin)) {
      return callback(null, true)
    }

    return callback(
      new ForbiddenErrorResponse(`${origin} not allowed by our CORS Policy.`)
    )
  },

  // Some legacy browsers (IE11, various SmartTVs) choke on 204
  optionsSuccessStatus: 200,

  // CORS sẽ cho phép nhận cookies từ request, (Nhá hàng :D | Ở khóa MERN Stack Advance nâng cao học trực tiếp mình sẽ hướng dẫn các bạn đính kèm jwt access token và refresh token vào httpOnly Cookies)
  credentials: true
}
