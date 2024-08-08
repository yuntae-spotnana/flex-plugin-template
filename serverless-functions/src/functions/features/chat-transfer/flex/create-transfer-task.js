const { prepareFlexFunction, extractStandardResponse } = require(Runtime.getFunctions()[
  'common/helpers/function-helper'
].path);
const TaskOperations = require(Runtime.getFunctions()['common/twilio-wrappers/taskrouter'].path);
const ChatOperations = require(Runtime.getFunctions()['features/chat-transfer/common/chat-operations'].path);

const requiredParameters = [
  {
    key: 'conversationId',
    purpose: 'conversation_id to link tasks for reporting',
  },
  {
    key: 'jsonAttributes',
    purpose: 'JSON calling tasks attributes to perpetuate onto new task',
  },
  {
    key: 'transferTargetSid',
    purpose: 'sid of target worker or target queue',
  },
  {
    key: 'transferQueueName',
    purpose: 'name of the queue if transfering to a queue, otherwise empty string',
  },
  {
    key: 'ignoreWorkerContactUri',
    purpose: 'woker Contact Uri to ignore when transfering',
  },
];

exports.handler = prepareFlexFunction(requiredParameters, async (context, event, callback, response, handleError) => {
  try {
    const {
      conversationId,
      jsonAttributes,
      transferTargetSid,
      transferQueueName,
      ignoreWorkerContactUri,
      taskChannelName,
      workflowSid: overriddenWorkflowSid,
      timeout: overriddenTimeout,
      priority: overriddenPriority,
    } = event;

    // use assigned values or use defaults
    const workflowSid = overriddenWorkflowSid || process.env.TWILIO_FLEX_CHAT_TRANSFER_WORKFLOW_SID;
    const timeout = overriddenTimeout || 86400;
    const priority = overriddenPriority || 0;
    console.log('taskChannelName', taskChannelName);

    // setup the new task attributes based on the old
    const originalTaskAttributes = JSON.parse(jsonAttributes);
    const newAttributes = {
      ...originalTaskAttributes,
      ignoreWorkerContactUri,
      transferTargetSid,
      transferQueueName,
      transferTargetType: transferTargetSid.startsWith('WK') ? 'worker' : 'queue',
      conversations: {
        ...originalTaskAttributes.conversations,
        conversation_id: conversationId,
      },
      workerSidsInConversation: [], // Compatibility with conversation transfer workflow
    };

    // create task for transfer
    const result = await TaskOperations.createTask({
      context,
      workflowSid,
      taskChannel: taskChannelName,
      attributes: newAttributes,
      priority,
      timeout,
    });

    const { success, status } = result;

    // push task data into chat meta data so that should we end the chat
    // while in queue the customer front end can trigger cancelling tasks associated
    // to the chat channel this is not critical to transfer but is ideal
    try {
      if (success) {
        const {
          data: {
            sid: taskSid,
            attributes: { channelSid },
          },
        } = result;
        await ChatOperations.addTaskToChannel({
          context,
          taskSid,
          channelSid,
        });
        response.setBody({ taskSid, ...extractStandardResponse(result) });
      } else {
        response.setBody({ ...extractStandardResponse(result) });
      }
    } catch (error) {
      console.error('Error updating chat channel with task sid created for it');
    }

    response.setStatusCode(status);

    return callback(null, response);
  } catch (error) {
    return handleError(error);
  }
});
