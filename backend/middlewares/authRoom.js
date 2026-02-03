import jwt from 'jsonwebtoken'

const authRoom = async (req, res, next) => {
  try {
    const { rtoken } = req.headers
    if (!rtoken) {
      return res.json({ success: false, message: "Not Authorized" })
    }
    const token_decode = jwt.verify(rtoken, process.env.JWT_SECRET)
    if (!req.body) req.body = {}
    req.body.roomId = token_decode.id
    next()
  } catch (error) {
    res.json({ success: false, message: error.message })
  }
}

export default authRoom
