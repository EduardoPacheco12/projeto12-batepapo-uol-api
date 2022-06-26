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

const mongoClient = new MongoClient(process.env.MONGO_URL_CONNECT);
let db;
client.connect().then(() => {
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
})

server.get("/participants", async (req, res) => {
	const participants = await db.collection("participants").find().toArray()
	res.send(participants);
})

server.listen(5000, () => {
	console.log("API está rodando");
});