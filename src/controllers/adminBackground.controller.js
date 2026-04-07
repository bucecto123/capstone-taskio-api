import { OkSuccessResponse } from '~/core/success.response'
import AdminBackgroundService from '~/services/adminBackground.service'

class AdminBackgroundController {
  static createAdminBackground = async (req, res) => {
    const backgroundData = {
      entity: req.body.entity,
      title: req.body.title,
      status: req.body.status,
      file: req.file
    }

    new OkSuccessResponse({
      metadata: await AdminBackgroundService.createBackground({
        backgroundData
      })
    }).send(res)
  }

  static getAdminBackgrounds = async (req, res) => {
    new OkSuccessResponse({
      metadata: await AdminBackgroundService.fetchBackgrounds({
        data: req.query
      })
    }).send(res)
  }

  static updateBlockBackground = async (req, res) => {
    const { backgroundId } = req.params
    new OkSuccessResponse({
      metadata: await AdminBackgroundService.updateBlockBackground({
        backgroundId
      })
    }).send(res)
  }
}
export default AdminBackgroundController
