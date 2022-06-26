import express, { json } from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import joi from "joi";
import dayjs from "dayjs";
dotenv.config();

const server = express();
server.use(cors());
server.use(express.json());

const mongoClient = new MongoClient("mongodb://127.0.0.1:27017");
let db;
mongoClient.connect().then(() => {
	db = mongoClient.db("batePapoUOL");
});

server.post("/participants", async (req, res) => {
	const body = req.body;
	const userSchema = joi.object({
		name: joi.string().required()
	})

	const userValidation = userSchema.validate(body, { abortEarly: false });
	if(userValidation.error) {
		return res.sendStatus(422);
	}
	const findUser = await db.collection("participants").findOne({ name: body.name })
	if(findUser) {
		return res.sendStatus(409)
	}

	try {
		await db.collection("participants").insertOne({
			name: body.name,
			lastStatus: Date.now()
		})
		await db.collection("messages").insertOne({
			from: body.name,
			to: "Todos",
			text: "entra na sala...",
			type: "status",
			time: dayjs().format("HH:mm:ss")
		})
		res.sendStatus(201);
	} catch (error) {
		res.sendStatus(500);
	}
});

server.get("/participants", async (req, res) => {
	const participants = await db.collection("participants").find().toArray();
	res.send(participants);
});

server.post("/messages", async (req, res) => {
	const {to, text, type} = req.body;
	const  { user }  = req.headers;
	const message = {
		from: user,
		to,
		text,
		type
	}
	const dbArray = await db.collection("participants").find({}).toArray();
	const dbUsers = dbArray.map((index) => index.name)
	const messageSchema = joi.object({
		from: joi.string().required().valid(...dbUsers),
		to: joi.string().required(),
		text: joi.string().required(),
		type: joi.string().required().valid("message", "private_message")
	});
	const messageValidation = messageSchema.validate(message, { abortEarly: false });
	if(messageValidation.error) {
		return res.sendStatus(422);
	}

	try {
		message.time = dayjs().format("HH:mm:ss");
		await db.collection("messages").insertOne(message);
		res.sendStatus(201);
	} catch(error) {
		res.sendStatus(500);
	}
});

server.get("/messages", async (req, res) => {
	const { limit } = req.query;
	const { user } = req.headers;
	const dbArray = await db.collection("messages").find({ $or: [{type: "message"}, { $or: [{to:{$in: [user, "Todos"]}}, {from: user}]}]}).toArray();
	if(!limit || limit > dbArray.length) {
		res.send(dbArray);
	} else {
		let returnedArrayDB = [];
		for(let i = 0; i < dbArray.length; i++) {
			if(i >= dbArray.length - limit) {
				returnedArrayDB.push(dbArray[i])
			}
		}
		res.send(returnedArrayDB);
	}
});

server.post("/status", async (req, res) => {
	const { user } = req.headers;
	const findUser = await db.collection("participants").findOne({ name: user });
	if (!findUser) {
		return res.sendStatus(404);
	}

	try {
		await db.collection("participants").updateOne({ name: user }, { $set: {
			lastStatus: Date.now()
		}})
		res.sendStatus(200);
	} catch (error) {
		res.sendStatus(500);
	}
	
});

server.listen(5000, () => {
	console.log("API está rodando");
});