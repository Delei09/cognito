import * as cdk from "aws-cdk-lib"
import { Construct } from "constructs"
import * as lambdaNodeJS from "aws-cdk-lib/aws-lambda-nodejs"
import * as apigateway from "aws-cdk-lib/aws-apigateway"
import * as cwlogs from "aws-cdk-lib/aws-logs"
import * as cognito from "aws-cdk-lib/aws-cognito"
import * as lambda from "aws-cdk-lib/aws-lambda"

interface CognitoAppStackProps extends cdk.StackProps {
   branch: string,
   productsFetchHandler: lambdaNodeJS.NodejsFunction,
   productsAdminHandler: lambdaNodeJS.NodejsFunction
}

export class CognitoAppStack extends cdk.Stack {
   constructor(scope: Construct, id: string, props: CognitoAppStackProps) {
      super(scope, id, props)

      const postConfirmationHandler = new lambdaNodeJS.NodejsFunction(this, "PostConfirmationFunction", {
         functionName: "PostConfirmationFunction",
         entry: "lambda/postConfirmationFunction.js",
         handler: "handler",
         bundling: {
            minify: false,
            sourceMap: false
         },
         tracing: lambda.Tracing.ACTIVE,
         memorySize: 129,
         timeout: cdk.Duration.seconds(5)
      })

      const preAuthenticationHandler = new lambdaNodeJS.NodejsFunction(this, "PreAuthenticationFunction", {
         functionName: "PreAuthenticationFunction",
         entry: "lambda/preAuthenticationFunction.js",
         handler: "handler",
         bundling: {
            minify: false,
            sourceMap: false
         },
         tracing: lambda.Tracing.ACTIVE,
         memorySize: 129,
         timeout: cdk.Duration.seconds(5)
      })

      //Cognito customer user pool
      const customerPool = new cognito.UserPool(this, "CustomerPool", {
         userPoolName: "CustomerPool",
         lambdaTriggers: {
            postConfirmation: postConfirmationHandler,
            preAuthentication: preAuthenticationHandler
         },
         removalPolicy: cdk.RemovalPolicy.DESTROY,
         selfSignUpEnabled: true,
         autoVerify: {
            email: true,
            phone: false
         },
         userVerification: {
            emailStyle: cognito.VerificationEmailStyle.CODE,
            emailSubject: 'Verify your email to use Cognito Test Service!',
            emailBody: 'Thanks for signing up to Cognito Test service! This is your verification code {####}'
         },
         signInAliases: {
            username: false,
            email: true
         },
         standardAttributes: {
            fullname: {
               required: true,
               mutable: false
            }
         },
         passwordPolicy: {
            minLength: 8,
            requireLowercase: true,
            requireUppercase: true,
            requireDigits: true,
            requireSymbols: true,
            tempPasswordValidity: cdk.Duration.days(3)
         },
         accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,         
      })
      customerPool.addDomain('CustomerDomain', {
         cognitoDomain: {
            domainPrefix: props.branch.concat('-pcs-customer-service')
         }
      })

      //Cognito admin user pool
      const adminPool = new cognito.UserPool(this, "AdminPool", {
         userPoolName: "AdminPool",
         removalPolicy: cdk.RemovalPolicy.DESTROY,
         selfSignUpEnabled: true,
         autoVerify: {
            email: true,
            phone: false
         },
         userVerification: {
            emailStyle: cognito.VerificationEmailStyle.CODE,
            emailSubject: 'Verify your email to use Cognito Test Service!',
            emailBody: 'Thanks for signing up to Cognito Test service! This is your verification code {####}'
         },
         signInAliases: {
            username: false,
            email: true
         },
         standardAttributes: {
            fullname: {
               required: true,
               mutable: false
            }
         },
         passwordPolicy: {
            minLength: 8,
            requireLowercase: true,
            requireUppercase: true,
            requireDigits: true,
            requireSymbols: true,
            tempPasswordValidity: cdk.Duration.days(3)
         },
         accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,         
      })
      adminPool.addDomain('AdminDomain', {
         cognitoDomain: {
            domainPrefix: props.branch.concat('-vol-admin-service')
         }
      })

      const customerWebScope = new cognito.ResourceServerScope({
         scopeName: "web",
         scopeDescription: "Customer web operations"
      })
      const customerMobileScope = new cognito.ResourceServerScope({
         scopeName: "mobile",
         scopeDescription: "Customer mobile operations"
      })
      const adminWebScope = new cognito.ResourceServerScope({
         scopeName: "web",
         scopeDescription: "Admin web operations"
      })

      const customerResourceServer = 
         customerPool.addResourceServer('CustomerResourceServer', {
            identifier: "customer",
            userPoolResourceServerName: "CustomerResourceServer",
            scopes: [customerWebScope, customerMobileScope]
         })

      const adminResourceServer = 
         adminPool.addResourceServer('AdminResourceServer', {
            identifier: "admin",
            userPoolResourceServerName: "AdminResourceServer",
            scopes: [adminWebScope]
         })

      customerPool.addClient('customer-web-client', {
         userPoolClientName: "customerWebClient",
         authFlows: {
            userPassword: true
         },
         accessTokenValidity: cdk.Duration.minutes(60),
         refreshTokenValidity: cdk.Duration.days(7),
         oAuth: {
            scopes: [cognito.OAuthScope
               .resourceServer(customerResourceServer, customerWebScope)]
         }
      })

      customerPool.addClient('customer-mobile-client', {
         userPoolClientName: "customerMobileClient",
         authFlows: {
            userPassword: true
         },
         accessTokenValidity: cdk.Duration.minutes(60),
         refreshTokenValidity: cdk.Duration.days(7),
         oAuth: {
            scopes: [cognito.OAuthScope
               .resourceServer(customerResourceServer, customerMobileScope)]
         }
      })

      adminPool.addClient('admin-web-client', {
         userPoolClientName: "adminWebClient",
         authFlows: {
            userPassword: true
         },
         accessTokenValidity: cdk.Duration.minutes(60),
         refreshTokenValidity: cdk.Duration.days(7),
         oAuth: {
            scopes: [cognito.OAuthScope
               .resourceServer(adminResourceServer, adminWebScope)]
         }
      })

      const productsAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(this, "ProductsAuthorizer", {
         cognitoUserPools: [customerPool, adminPool],
         authorizerName: "ProductsAuthorizer"
      })

      const productsAdminAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(this, "ProductsAdminAuthorizer", {
         cognitoUserPools: [adminPool],
         authorizerName: "ProductsAdminAuthorizer"
      })

      const logGroup = new cwlogs.LogGroup(this, "CognitoApiLogs")
      const api = new apigateway.RestApi(this, "CognitoApi", {
         restApiName: "Cognito API",
         deployOptions: {
            accessLogDestination: new apigateway.LogGroupLogDestination(logGroup),
            accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields({
               caller: true,
               httpMethod: true,
               ip: true,
               protocol: true,
               requestTime: true,
               resourcePath: true,
               responseLength: true,
               status: true,
               user: true
            })
         }
      })

      const productsFetchWebMobileIntegrationOption = {
         authorizer: productsAuthorizer,
         authorizationType: apigateway.AuthorizationType.COGNITO,
         authorizationScopes: ['customer/web', 'customer/mobile', 'admin/web']
      }

      const productsFetchWebIntegrationOption = {
         authorizer: productsAuthorizer,
         authorizationType: apigateway.AuthorizationType.COGNITO,
         authorizationScopes: ['customer/web', 'admin/web']
      }

      const productsAdminWebIntegrationOption = {
         authorizer: productsAdminAuthorizer,
         authorizationType: apigateway.AuthorizationType.COGNITO,
         authorizationScopes: ['admin/web']
      }

      const productsFetchFunctionIntegration = 
         new apigateway.LambdaIntegration(props.productsFetchHandler)
      const productsResource = api.root.addResource("products")

      //List all products - Web and mobile clients
      productsResource.addMethod("GET", 
         productsFetchFunctionIntegration, productsFetchWebMobileIntegrationOption)

      //Get product by id - Web client
      const productIdResource = productsResource.addResource("{id}")
      productIdResource.addMethod("GET", 
         productsFetchFunctionIntegration, productsFetchWebIntegrationOption)

      const productsAdminFunctionIntegration = 
         new apigateway.LambdaIntegration(props.productsAdminHandler)
      //POST /products
      productsResource.addMethod("POST", 
         productsAdminFunctionIntegration, productsAdminWebIntegrationOption)
      
   }
}
