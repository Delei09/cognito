const AWS = require("aws-sdk");
const AWSXRay = require("aws-xray-sdk-core");

const xRay = AWSXRay.captureAWS(require("aws-sdk"));
const awsRegion = process.env.AWS_REGION

AWS.config.update({
   region: awsRegion,
});

exports.handler = async function (event, context) {
   const apiRequestId = event.requestContext.requestId;
   const lambdaRequestId = context.awsRequestId;
   const method = event.httpMethod;

   console.log(
     `API Gateway RequestId: ${apiRequestId} - Lambda RequestId: ${lambdaRequestId}`
   );

   if (method === 'GET') {
      if (event.resource === "/products") {
         //Web and mobile clients
         return {
            statusCode: 200,
            headers: {},
            body: JSON.stringify("GET /products"),  
         }   
      } else if (event.resource === "/products/{id}") {
         //Web client
         const productId = event.pathParameters.id;
         return {
            statusCode: 200,
            headers: {},
            body: JSON.stringify(`GET /products/${productId}`),  
         }   
      }   
   }
   
   return {
      statusCode: 400,
      headers: {},
      body: JSON.stringify("Bad request"),  
   }
}