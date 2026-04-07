import { GET_DB } from '~/config/mongodb'
import { pagingSkipValue } from '~/utils/algorithms'
import { boardModel } from '~/models/board.model'
import { ObjectId } from 'mongodb'
import { DEFAULT_ITEMS_PER_PAGE, DEFAULT_PAGE } from '~/utils/constants'
import { columnModel } from '~/models/column.model'
import { cardModel } from '~/models/card.model'

class BoardRepo {
  static findOne = async ({ filter, options = {} }) => {
    return await GET_DB()
      .collection(boardModel.BOARD_COLLECTION_NAME)
      .findOne(filter, options)
  }

  static findById = async ({ _id }) => {
    const result = await GET_DB()
      .collection(boardModel.BOARD_COLLECTION_NAME)
      .findOne({ _id: new ObjectId(_id) })
    return result
  }

  static findMany = async ({ filter, options = {} }) => {
    return await GET_DB()
      .collection(boardModel.BOARD_COLLECTION_NAME)
      .find(filter, options)
      .toArray()
  }

  static count = async ({ filter = {} }) => {
    return await GET_DB()
      .collection(boardModel.BOARD_COLLECTION_NAME)
      .countDocuments(filter)
  }

  static getBoards = async ({ filters }) => {
    const page = filters?.page ?? DEFAULT_PAGE
    const itemsPerPage = filters?.itemsPerPage ?? DEFAULT_ITEMS_PER_PAGE
    const q = filters?.q ?? ''
    const userId = filters?.userId

    const queryConditions = [
      { _destroy: false },
      {
        $or: [
          { ownerIds: { $all: [new ObjectId(userId)] } },
          { memberIds: { $all: [new ObjectId(userId)] } }
        ]
      }
    ]

    // xử lí query cho từng trường hợp search board , ví dụ search title...
    if (q) {
      Object.keys(q).forEach((key) => {
        // queryFilters[key] ví dụ queryFilters[title] nếu phía FE đẩy lên q[title]

        // Có phân biệt chữ hoa chữ thường
        // queryConditions.push({ [key]: { $regex: queryFilters[key] } })

        // Không phân biệt chữ hoa chữ thường
        queryConditions.push({
          [key]: { $regex: new RegExp(q[key], 'i') }
        })
      })
    }

    const query = await GET_DB()
      .collection(boardModel.BOARD_COLLECTION_NAME)
      .aggregate(
        [
          {
            $match: { $and: queryConditions }
          },
          // sort title của board theo A-Z (mặc định sẽ bị chữ B hoa đứng trước chữ a thường (theo chuẩn bảng mã ASCII)
          { $sort: { title: 1 } },
          // $facet để xử lý nhiều luồng trong một query
          {
            $facet: {
              // Luồng 01: Query boards
              queryBoards: [
                { $skip: pagingSkipValue(page, itemsPerPage) },
                { $limit: itemsPerPage }
              ],
              // Luồng 02: Query đếm tổng tất cả số lượng bản ghi boards trong DB và trả về vào biến: countedAllBoards
              queryTotalBoards: [{ $count: 'countedAllBoards' }]
            }
          }
        ],
        { collation: { locale: 'en' } }
      )
      .toArray()
    const res = query[0]
    return {
      boards: res.queryBoards || [],
      totalBoards: res.queryTotalBoards[0]?.countedAllBoards || 0
    }
  }

  static getDetail = async ({ _id }) => {
    try {
      const [board] = await GET_DB()
        .collection(boardModel.BOARD_COLLECTION_NAME)
        .aggregate([
          { $match: { _id: new ObjectId(_id) } },

          {
            $lookup: {
              from: columnModel.COLUMN_COLLECTION_NAME,
              let: { boardIdStr: { $toString: '$_id' } },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        { $eq: [{ $toString: '$boardId' }, '$$boardIdStr'] },
                        { $eq: ['$status', 'active'] }
                      ]
                    }
                  }
                }
              ],
              as: 'columns'
            }
          },

          {
            $lookup: {
              from: cardModel.CARD_COLLECTION_NAME,
              let: { boardIdStr: { $toString: '$_id' } },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        { $eq: [{ $toString: '$boardId' }, '$$boardIdStr'] },
                        { $eq: ['$status', 'active'] }
                      ]
                    }
                  }
                },
                {
                  $project: {
                    status: 0,
                    description: 0,
                    createdAt: 0,
                    updatedAt: 0,
                    archivedAt: 0
                  }
                }
              ],
              as: 'cards'
            }
          }
        ])
        .toArray()

      return board || null
    } catch (error) {
      throw error
    }
  }

  static createOne = async ({ data, session }) => {
    const validData = await boardModel.validateBeforeCreate(data)
    return GET_DB()
      .collection(boardModel.BOARD_COLLECTION_NAME)
      .insertOne(validData, { session })
  }

  static updateOne = async ({ _id, data, session }) => {
    if (data.columnOrderIds)
      data.columnOrderIds = data.columnOrderIds.map((_id) => new ObjectId(_id))

    const result = await GET_DB()
      .collection(boardModel.BOARD_COLLECTION_NAME)
      .findOneAndUpdate(
        { _id: new ObjectId(_id) },
        { $set: data },
        { returnDocument: 'after', session }
      )
    return result
  }

  static pushColumnOrderIds = async ({ column, session }) => {
    const result = await GET_DB()
      .collection(boardModel.BOARD_COLLECTION_NAME)
      .findOneAndUpdate(
        { _id: new ObjectId(column.boardId) },
        { $push: { columnOrderIds: new ObjectId(column._id) } },
        { returnDocument: 'after', session }
      )
    return result
  }

  static pullColumnOrderIds = async ({ column, session }) => {
    const result = await GET_DB()
      .collection(boardModel.BOARD_COLLECTION_NAME)
      .findOneAndUpdate(
        { _id: new ObjectId(column.boardId) },
        { $pull: { columnOrderIds: new ObjectId(column._id) } },
        { returnDocument: 'after', session }
      )
    return result
  }

  static pushMemberIds = async ({ _id, userId }) => {
    const result = await GET_DB()
      .collection(boardModel.BOARD_COLLECTION_NAME)
      .findOneAndUpdate(
        { _id: new ObjectId(_id) },
        { $push: { memberIds: new ObjectId(userId) } },
        { returnDocument: 'after' }
      )
    return result
  }

  static updateMany = async ({ filter, data, session }) => {
    return await GET_DB()
      .collection(boardModel.BOARD_COLLECTION_NAME)
      .updateMany(filter, data, { returnDocument: 'after', session })
  }
}
export default BoardRepo
