import * as cdk from "aws-cdk-lib"
import { Construct } from "constructs"
import * as lambdaNodeJS from "aws-cdk-lib/aws-lambda-nodejs"
import * as lambda from "aws-cdk-lib/aws-lambda"

export class ProductsFetchStack extends cdk.Stack {
   readonly productsFetchHandler: lambdaNodeJS.NodejsFunction

   constructor(scope: Construct, id: string, props?: cdk.StackProps) {
      super(scope, id, props)

      this.productsFetchHandler = new lambdaNodeJS.NodejsFunction(this, "ProductsFetchFunction", {
         functionName: "ProductsFetchFunction",
         entry: "lambda/productsFetchFunction.js",
         handler: "handler",
         bundling: {
            minify: false,
            sourceMap: false
         },
         tracing: lambda.Tracing.ACTIVE,
         memorySize: 129,
         timeout: cdk.Duration.seconds(5)
      })
   }
}