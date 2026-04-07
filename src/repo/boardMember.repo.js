import { GET_DB } from '~/config/mongodb'
import { boardMemberModel } from '~/models/boardMember.model'
import { boardRoleModel } from '~/models/boardRole.model'
import { userModel } from '~/models/user.model'
import { workspaceMemberModel } from '~/models/workspaceMember.model'

class BoardMemberRepo {
  static createOne = async ({ data, session }) => {
    const validData = await boardMemberModel.validateBeforeCreate(data)
    return await GET_DB()
      .collection(boardMemberModel.BOARD_MEMBER_COLLECTION_NAME)
      .insertOne(validData, { session })
  }

  static getMembers = async ({ filter, data, options = {} }) => {
    const { sort = { createdAt: -1 }, skip = 0, limit = 50 } = options
    const { search = '' } = data

    return await GET_DB()
      .collection(boardMemberModel.BOARD_MEMBER_COLLECTION_NAME)
      .aggregate([
        { $match: filter },

        {
          $addFields: {
            boardRoleObjectId: { $toObjectId: '$boardRoleId' },
            workspaceMemberObjectId: { $toObjectId: '$workspaceMemberId' }
          }
        },

        {
          $lookup: {
            from: boardRoleModel.BOARD_ROLE_COLLECTION_NAME,
            localField: 'boardRoleObjectId',
            foreignField: '_id',
            as: 'role'
          }
        },
        {
          $unwind: {
            path: '$role',
            preserveNullAndEmptyArrays: true
          }
        },

        {
          $lookup: {
            from: workspaceMemberModel.WORKSPACE_MEMBER_COLLECTION_NAME,
            localField: 'workspaceMemberObjectId',
            foreignField: '_id',
            as: 'member'
          }
        },
        {
          $unwind: {
            path: '$member',
            preserveNullAndEmptyArrays: true
          }
        },

        {
          $addFields: {
            userObjectId: {
              $convert: {
                input: '$member.userId',
                to: 'objectId',
                onError: null,
                onNull: null
              }
            }
          }
        },

        {
          $lookup: {
            from: userModel.USER_COLLECTION_NAME,
            localField: 'userObjectId',
            foreignField: '_id',
            as: 'user'
          }
        },
        {
          $unwind: {
            path: '$user',
            preserveNullAndEmptyArrays: true
          }
        },

        ...(search
          ? [
              {
                $match: {
                  $or: [
                    { 'user.email': { $regex: search, $options: 'i' } },
                    { 'user.displayName': { $regex: search, $options: 'i' } }
                  ]
                }
              }
            ]
          : []),

        {
          $project: {
            _id: 1,
            status: 1,
            joinAt: 1,
            boardRoleId: 1,
            userId: '$user._id',
            user: {
              displayName: '$user.displayName',
              email: '$user.email',
              avatar: '$user.avatar'
            }
          }
        },

        { $sort: sort },
        { $skip: skip },
        { $limit: limit }
      ])
      .toArray()
  }

  static checkAccess = async ({ boardId, userId, session }) => {
    const [result] = await GET_DB()
      .collection(boardMemberModel.BOARD_MEMBER_COLLECTION_NAME)
      .aggregate(
        [
          {
            $match: {
              $expr: {
                $eq: [{ $toString: '$boardId' }, String(boardId)]
              }
            }
          },
          {
            $lookup: {
              from: workspaceMemberModel.WORKSPACE_MEMBER_COLLECTION_NAME,
              let: {
                workspaceMemberIdStr: { $toString: '$workspaceMemberId' }
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        {
                          $eq: [{ $toString: '$_id' }, '$$workspaceMemberIdStr']
                        },
                        {
                          $eq: [{ $toString: '$userId' }, String(userId)]
                        }
                      ]
                    }
                  }
                }
              ],
              as: 'matchedWorkspaceMember'
            }
          },
          {
            $match: {
              'matchedWorkspaceMember.0': { $exists: true }
            }
          },
          { $limit: 1 }
        ],
        { session }
      )
      .toArray()

    return result
  }

  static findMemberInBoard = async ({ userId, boardId, session }) => {
    const [member] = await GET_DB()
      .collection(workspaceMemberModel.WORKSPACE_MEMBER_COLLECTION_NAME)
      .aggregate(
        [
          { $match: { userId } },
          {
            $addFields: { workspaceMemberIdString: { $toString: '$_id' } }
          },
          {
            $lookup: {
              from: boardMemberModel.BOARD_MEMBER_COLLECTION_NAME,
              let: { workspaceMemberId: '$workspaceMemberIdString' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        { $eq: ['$workspaceMemberId', '$$workspaceMemberId'] },
                        { $eq: ['$boardId', boardId] },
                        { $eq: ['$status', 'active'] }
                      ]
                    }
                  }
                },
                { $limit: 1 }
              ],
              as: 'boardMember'
            }
          },
          { $unwind: '$boardMember' },
          { $replaceRoot: { newRoot: '$boardMember' } }
        ],
        { session }
      )
      .toArray()

    return member || null
  }

  static updateOne = async ({ filter, data, session }) => {
    return await GET_DB()
      .collection(boardMemberModel.BOARD_MEMBER_COLLECTION_NAME)
      .findOneAndUpdate(filter, data, { session, returnDocument: 'after' })
  }

  static findOne = async ({ filter, options = {} }) => {
    return await GET_DB()
      .collection(boardMemberModel.BOARD_MEMBER_COLLECTION_NAME)
      .findOne(filter, options)
  }

  static findMany = async ({ filter, options = {} }) => {
    return await GET_DB()
      .collection(boardMemberModel.BOARD_MEMBER_COLLECTION_NAME)
      .find(filter, options)
      .toArray()
  }

  static countDocuments = async ({ filter }) => {
    return await GET_DB()
      .collection(boardMemberModel.BOARD_MEMBER_COLLECTION_NAME)
      .countDocuments(filter)
  }
}

export default BoardMemberRepo
