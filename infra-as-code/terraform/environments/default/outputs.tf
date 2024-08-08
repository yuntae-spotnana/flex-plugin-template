# these aren't used for anything other than debug output within the CI workflow.

# FEATURE: remove-all
output "template_example_assign_to_anyone_workflow_sid" {
  value = twilio_taskrouter_workspaces_workflows_v1.template_example_assign_to_anyone.sid
  description = "Template example assign to anyone workflow SID"
}
# END FEATURE: remove-all


# FEATURE: conversation-transfer
output "chat_transfer_workflow_sid" {
  value = module.conversation-transfer.chat_transfer_workflow_sid
  description = "Chat transfer workflow SID"
}
# END FEATURE: conversation-transfer



