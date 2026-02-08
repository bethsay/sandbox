import * as fs from 'node:fs';
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

// Initialize the DynamoDB Document Client (SDK v3)
const client = new DynamoDBClient({});
const dynamo = DynamoDBDocumentClient.from(client);

// Load the HTML once at the top
const html = fs.readFileSync('index.html', { encoding: 'utf8' });

/**
 * Returns an HTML page containing an interactive Web-based tutorial.
 * Visit the function URL to see it and learn how to build with lambda.
 */
export const handler = async (event) => {

    // 1. Insert form that queries your inputs and returns them below the form
    let modifiedHTML = dynamicForm(html,event.queryStringParameters)

    // 2. Send form data into DynamoDB
    if(event.queryStringParameters){
        try {
            await dynamo.send(new PutCommand({
                TableName: "first-dynamodb",
                Item: {
                  PK: "form",
                  SK: event.requestContext.requestId,
                  form: event.queryStringParameters
                }
            }));
        } catch (err) {
            console.error("Error inserting into DynamoDB:", err);
        }
    }

    // 3. Query the DynamoDB table and display the results
    let params = {
        TableName: "first-dynamodb",
        KeyConditionExpression: "PK = :PK",
        ExpressionAttributeValues: {
            ":PK": "form"
        }
    };
    try {
        const tableQuery = await dynamo.send(new QueryCommand(params));
        modifiedHTML = dynamictable(modifiedHTML, tableQuery);
        console.log("Success:", tableQuery.Items);
    } catch (err) {
        console.error("Error querying DynamoDB:", err);
    }

    const response = {
        statusCode: 200,
        headers: {
            'Content-Type': 'text/html',
        },
        body: modifiedHTML,
    };
    return response;
};

function dynamicForm(html,queryStringParameters){
    let formres = ''
    if(queryStringParameters){
            Object.values(queryStringParameters).forEach(val => {
                  formres =formres+val+' ';
            });
    }
    return html.replace('{formResults}','<h4>Form Submission: '+formres+'</h4>')
}

function dynamictable(html, tableQuery) {
    let table = "";
    if (tableQuery.Items && tableQuery.Items.length > 0) {
        for (let i = 0; i < tableQuery.Items.length; i++) {
            table = table + "<li>" + JSON.stringify(tableQuery.Items[i]) + "</li>";
        }
        table = "<pre>" + table + "</pre>";
    }
    return html.replace("{table}", "<h4>DynamoDB:</h4>" + table);
}
