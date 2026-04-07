import express from 'express'
import AdminBackgroundController from '~/controllers/adminBackground.controller'
import asyncHandler from '~/helpers/asyncHandler'
import { multerUploadMiddleware } from '~/middlewares/multerUpload.middleware'

const Router = express.Router()

Router.route('/')
  .get(asyncHandler(AdminBackgroundController.getAdminBackgrounds))
  .post(
    asyncHandler(multerUploadMiddleware.uploadSingleImage),
    asyncHandler(AdminBackgroundController.createAdminBackground)
  )

Router.route('/block/:backgroundId').patch(
  asyncHandler(AdminBackgroundController.updateBlockBackground)
)

export const adminBackgroundRoute = Router
