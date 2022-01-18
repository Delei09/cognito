import * as cdk from "aws-cdk-lib"
import { Construct } from "constructs"
import * as cdk_pipeline from "aws-cdk-lib/pipelines"
import { CognitoStage } from "./cognito-stage"

interface PipelineStackProps extends cdk.StackProps {
   branch: string,
   awsAccount: string,
   awsRegion: string
}

export class PipelineStack extends cdk.Stack {
   constructor(scope: Construct, id: string, props: PipelineStackProps) {
      super(scope, id, props)

      const pipeline = new cdk_pipeline.CodePipeline(this, 'CognitoPipeline'.concat(props.branch), {
         pipelineName: 'CognitoPipeline'.concat(props.branch),
         dockerEnabledForSynth: true,
         crossAccountKeys: true,
         synth: new cdk_pipeline.ShellStep('Synth', {
            input: cdk_pipeline.CodePipelineSource.gitHub('Delei09/cognito', props.branch),
            commands: [
               'npm ci',
               'npm run build',
               'npx cdk synth'
            ]
         })
      })

      //Add the stage here!
      const cognitoStage = new CognitoStage(this, props.branch.concat("Stage"), {
         branch: props.branch,
         env: {
            account: props.awsAccount,
            region: props.awsRegion
         }
      })
      pipeline.addStage(cognitoStage)
   }
}