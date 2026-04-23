import {
  BedrockRuntimeClient,
  InvokeModelCommand
} from '@aws-sdk/client-bedrock-runtime'
import { env } from '~/config/environment'

/**
 * Bedrock client dùng EC2 instance profile (default credential provider chain)
 * thay vì access key cross-account. SDK tự lấy credentials từ IMDSv2 khi chạy
 * trên EC2, hoặc từ ~/.aws/credentials khi chạy local dev.
 *
 * EC2 instance profile cần IAM policy cho phép bedrock:InvokeModel trên
 * model ARN của Claude Haiku 4.5 inference profile (xem bedrock-ec2-policy.json
 * trong taskio-ai-lambdas/iam-policies/).
 *
 * Local dev: không cần set credentials — nếu có aws configure hoặc
 * AWS_PROFILE/AWS_ACCESS_KEY_ID env sẽ được dùng tự động.
 */

let bedrockClient = null

const GET_BEDROCK_CLIENT = () => {
  if (bedrockClient) return bedrockClient

  bedrockClient = new BedrockRuntimeClient({
    region: env.BEDROCK_REGION || 'us-east-1'
    // credentials: KHÔNG truyền — SDK auto pickup từ instance profile /
    // ~/.aws/credentials / env vars theo thứ tự default credential provider chain
  })

  return bedrockClient
}

const invokeModel = async ({ prompt, maxTokens = 1024 }) => {
  const client = GET_BEDROCK_CLIENT()

  const modelId =
    env.BEDROCK_MODEL_ID || 'us.anthropic.claude-haiku-4-5-20251001-v1:0'

  const command = new InvokeModelCommand({
    modelId,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }]
    })
  })

  const response = await client.send(command)
  const body = JSON.parse(new TextDecoder().decode(response.body))

  return body.content[0].text
}

export { GET_BEDROCK_CLIENT, invokeModel }
