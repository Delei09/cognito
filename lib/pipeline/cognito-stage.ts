import * as cdk from "aws-cdk-lib"
import { Construct } from "constructs"
import { CognitoAppStack } from "../stack/cognitoApp-stack"
import { ProductsFetchStack } from "../stack/productsFetch-stack"
import { ProductsAdminStack } from "../stack/productsAdmin-stack"

interface CognitoStageProps extends cdk.StackProps {
   branch: string
}

export class CognitoStage extends cdk.Stage {
   constructor(scope: Construct, id: string, props: CognitoStageProps) {
      super(scope, id, props)

      const productsFetchStack = new ProductsFetchStack(this, "ProductsFetch")

      const productsAdminStack = new ProductsAdminStack(this, "ProductsAdmin")

      const cognitoAppStack = new CognitoAppStack(this, "CognitoApp", {
         branch: props.branch,
         productsFetchHandler: productsFetchStack.productsFetchHandler,
         productsAdminHandler: productsAdminStack.productsAdminHandler
      })
      cognitoAppStack.addDependency(productsFetchStack)
      cognitoAppStack.addDependency(productsAdminStack)
   }
}