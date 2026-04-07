import { GET_DB } from '~/config/mongodb'
import { taskModel } from '~/models/task.model'

class TaskRepo {
  static getListByCardId = async ({ cardId, options = {} }) => {
    const rootSort = options.sort || { createdAt: 1 }
    const childSort = options.childSort || { createdAt: 1 }

    return await GET_DB()
      .collection(taskModel.TASK_COLLECTION_NAME)
      .aggregate([
        { $match: { cardId, parentTaskId: null } },

        {
          $lookup: {
            from: taskModel.TASK_COLLECTION_NAME,
            let: { parentTaskIdStr: { $toString: '$_id' } },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$parentTaskId', '$$parentTaskIdStr'] },
                      { $eq: ['$cardId', cardId] }
                    ]
                  }
                }
              },
              { $sort: childSort }
            ],
            as: 'childTasks'
          }
        },

        { $sort: rootSort }
      ])
      .toArray()
  }

  static findOne = async ({ filter, options = {} }) => {
    return await GET_DB()
      .collection(taskModel.TASK_COLLECTION_NAME)
      .findOne(filter, options)
  }

  static findMany = async ({ filter, options = {} }) => {
    return await GET_DB()
      .collection(taskModel.TASK_COLLECTION_NAME)
      .find(filter, options)
      .toArray()
  }

  static createOne = async ({ data, session }) => {
    const validData = await taskModel.validateBeforeCreate(data)
    return await GET_DB()
      .collection(taskModel.TASK_COLLECTION_NAME)
      .insertOne(validData, { session })
  }

  static updateOne = async ({ filter, data, session }) => {
    return await GET_DB()
      .collection(taskModel.TASK_COLLECTION_NAME)
      .findOneAndUpdate(filter, data, { session, returnDocument: 'after' })
  }

  static deleteOne = async ({ filter, session }) => {
    return await GET_DB()
      .collection(taskModel.TASK_COLLECTION_NAME)
      .deleteOne(filter, { session })
  }

  static deleteMany = async ({ filter, session }) => {
    return await GET_DB()
      .collection(taskModel.TASK_COLLECTION_NAME)
      .deleteMany(filter, { session })
  }
}

export default TaskRepo
