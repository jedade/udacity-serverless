import * as AWS from 'aws-sdk'
//import * as AWSXRay from 'aws-xray-sdk'
import { DocumentClient } from 'aws-sdk/clients/dynamodb'
//import { createLogger } from '../utils/logger'
import { TodoItem } from '../models/TodoItem'
import { TodoUpdate } from '../models/TodoUpdate';
const AWSXRay = require('aws-xray-sdk')

const XAWS = AWSXRay.captureAWS(AWS)

//const logger = createLogger('TodosAccess')
const docClient: DocumentClient = createDynamoDBClient()
const todosTable = process.env.TODOS_TABLE
const todoIndex = process.env.TODOS_CREATED_AT_INDEX
// TODO: Implement the dataLayer logic

export async function createTodo(todo: TodoItem): Promise<TodoItem> {
    await docClient.put({
      TableName: todosTable,
      Item: todo
    }).promise()

    return todo
}

export async function getAllTodosByUserId(userId: string): Promise<TodoItem[]> {
    const result = await docClient.query({
        TableName: todosTable,
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
            ':userId': userId
        }
    }).promise()
    
    const items = result.Items
    return items as TodoItem[]
    
}

export async function getTodosById(todoId: string): Promise<TodoItem> {
    const result = await docClient.query({
        TableName: todosTable,
        IndexName: todoIndex,
        KeyConditionExpression: 'todoId = :todoId',
        ExpressionAttributeValues: {
            ':todoId': todoId
        }
    }).promise()
    
    const items = result.Items
    if(items.length !== 0) return result.Items[0] as TodoItem

    return null
}

export async function updateTodo(todo: TodoItem): Promise<TodoItem> {
    const result = await docClient.update({
        TableName: todosTable,
        Key: {
            userId: todo.userId,
            todoId: todo.todoId
        },
        UpdateExpression: 'set attachmentUrl = :attachmentUrl',
        ExpressionAttributeValues: {
            ':attachmentUrl': todo.attachmentUrl
        },
        ReturnValues: 'UPDATED_NEW' 
    }).promise()
    
    return result.Attributes as TodoItem
}

export async function deleteTodo(userId: string, todoId: string): Promise<TodoItem> {
    await docClient
      .delete({
        TableName: todosTable,
        Key: {
            userId,
            todoId
        }
    }).promise()

    return null
}

export async function updateTodoItem(userId: string, todoId: string, todoUpdate: TodoUpdate): Promise<TodoItem> {
    const result = await docClient.update({
        TableName: todosTable,
        Key: {
            userId,
            todoId
        },
        UpdateExpression: 'set #name= :name, dueDate= :dueDate,done = :done',
        ExpressionAttributeNames: {
            '#name': 'name'
        },
        ExpressionAttributeValues: {
            ':name': todoUpdate.name,
            ':dueDate': todoUpdate.dueDate,
            ':done': todoUpdate.done
        }
    }).promise()
    
    return result.Attributes as TodoItem
}


function createDynamoDBClient() {
    if (process.env.IS_OFFLINE) {
      console.log('Creating a local DynamoDB instance')
      return new XAWS.DynamoDB.DocumentClient({
        region: 'localhost',
        endpoint: 'http://localhost:8000'
      })
    }
  
    return new XAWS.DynamoDB.DocumentClient()
}