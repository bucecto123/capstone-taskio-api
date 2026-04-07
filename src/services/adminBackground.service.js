import { mongoClientInstance } from '~/config/mongodb'
import S3Provider from '~/providers/S3Provider'
import BackgroundRepo from '~/repo/adminBackground.repo'

class AdminBackgroundService {
  static createBackground = async ({ backgroundData }) => {
    const session = await mongoClientInstance.startSession()
    try {
      session.startTransaction()

      const uploaded = await S3Provider.upload(backgroundData.file)

      const newBackground = {
        entity: backgroundData.entity,
        title: backgroundData.title,
        image: S3Provider.getUrl(uploaded.fileKey),
        status: backgroundData.status
      }

      const createdFile = await BackgroundRepo.createOne({
        data: newBackground,
        session
      })

      await session.commitTransaction()

      return createdFile
    } catch (error) {
      await session.abortTransaction()
      throw error
    }
  }

  static fetchBackgrounds = async ({ data }) => {
    const keyword = data?.search?.trim() || ''
    const page = Number(data?.page || 1)
    const limit = Number(data?.limit || 8)
    const skip = (page - 1) * limit

    const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

    const filter = keyword
      ? {
          $or: [
            { title: { $regex: escapedKeyword, $options: 'i' } },
            { entity: { $regex: escapedKeyword, $options: 'i' } }
          ]
        }
      : {}

    const [backgrounds, totalCount] = await Promise.all([
      BackgroundRepo.findManyWithPagination({
        filter,
        skip,
        limit
      }),
      BackgroundRepo.countDocuments({ filter })
    ])

    return {
      backgrounds,
      totalCount,
      page,
      limit
    }
  }

  static updateBlockBackground = async ({ backgroundId }) => {
    const background = await BackgroundRepo.findById({ _id: backgroundId })

    if (!background) {
      throw new Error('Background not found')
    }

    const updatedBackground = await BackgroundRepo.updateById({
      _id: backgroundId,
      data: {
        status: background.status === 'active' ? 'inactive' : 'active'
      }
    })

    return updatedBackground
  }
}
export default AdminBackgroundService
