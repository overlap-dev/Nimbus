// import { Parser } from '@asyncapi/parser';
// import { GenericException } from '../exception/genericException.ts';
// import { getLogger } from '../log/logger.ts';

// export type AsyncApiRouterInput = {
//     apiSpec: string;
// };

// export const asyncApiRouter = async ({
//     apiSpec,
// }: AsyncApiRouterInput) => {
//     const parser = new Parser();
//     const { document, diagnostics } = await parser.parse(apiSpec);

//     if (!document) {
//         getLogger().error({
//             message: 'AsyncAPI document parsed with errors',
//             data: {
//                 diagnostics,
//             },
//         });

//         throw new GenericException('AsyncAPI document parsed with errors');
//     }

//     const asyncApiMessages = document.messages();

//     const registeredMessages: Record<string, any> = {};
//     for (const message of asyncApiMessages) {
//         const msgJson = message.json();

//         if (msgJson.payload) {
//             // TODO: Validate the payload to be a JSONSchema with the mandatory fields.
//             const type = msgJson.payload.properties.type.const;
//             registeredMessages[type] = msgJson.payload;
//         }
//     }

//     getLogger().info({
//         message: `Router registered ${
//             Object.keys(registeredMessages).length
//         } messages`,
//         data: {
//             registeredMessages: Object.keys(registeredMessages),
//         },
//     });

//     return (input: any) => {
//         return Promise.resolve({
//             statusCode: 200,
//             body: 'Hello, world!',
//         });
//     };
// };
