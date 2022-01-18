import * as cdk from "aws-cdk-lib"
import { Construct } from "constructs"
import * as lambdaNodeJS from "aws-cdk-lib/aws-lambda-nodejs"
import * as lambda from "aws-cdk-lib/aws-lambda"

export class ProductsAdminStack extends cdk.Stack {
   readonly productsAdminHandler: lambdaNodeJS.NodejsFunction

   constructor(scope: Construct, id: string, props?: cdk.StackProps) {
      super(scope, id, props)

      this.productsAdminHandler = new lambdaNodeJS.NodejsFunction(this, "ProductsAdminFunction", {
         functionName: "ProductsAdminFunction",
         entry: "lambda/productsAdminFunction.js",
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