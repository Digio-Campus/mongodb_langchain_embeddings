import OpenAI from "openai";
import {OpenAIEmbeddings} from "@langchain/openai";

import {MongoClient, ObjectId} from 'mongodb';
import {Document} from 'langchain/document';

import {RecursiveCharacterTextSplitter} from 'langchain/text_splitter';

const url = 'mongodb+srv://94juanvalera94:mongodbjuan@cluster0.sd2zhrd.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const client = new MongoClient(url);
await client.connect();
const db = client.db('penguin');
const collection = db.collection('vectors');


//const openai = new OpenAI({base_url: "http://127.0.0.1:8081/v1", api_key: "sk-no-key-required"})


const story = "Once upon a time in the quirky town of Whimsyville, there was a particularly peculiar penguin named Percy. Unlike his fellow flightless friends, Percy had an insatiable desire to soar through the sky like a majestic eagle. So, armed with a pair of homemade wings fashioned from discarded banana peels and rubber bands, Percy embarked on his daring quest to defy gravity.\n" +
    "\n" +
    "With a determined waddle and a hopeful gleam in his beady eyes, Percy climbed to the highest peak in Whimsyville, a precarious pile of mismatched furniture known as Mount Junkmore. As he reached the summit, Percy took a deep breath and flapped his banana peel wings with all his might.\n" +
    "\n" +
    "To the amazement of the onlooking animals, Percy actually managed to lift off the ground! For a brief moment, he soared through the air with the grace of a seasoned aviator. But alas, his flight was short-lived as one of his rubber bands snapped, sending him tumbling downward in a flurry of feathers and banana peels.\n" +
    "\n" +
    "Miraculously, Percy landed in a giant bowl of spaghetti being prepared for the annual Whimsyville Pasta Festival. Covered in sauce and tangled in noodles, Percy emerged from the bowl with a sheepish grin, realizing that perhaps he was meant to stick to waddling instead of flying.\n" +
    "\n" +
    "From that day on, Percy became the unofficial mascot of the Pasta Festival, delighting residents with his comical antics and reminding everyone that sometimes, it's okay to just embrace who you are, feathers, spaghetti stains, and all. And as for Percy, he learned that while he may never soar through the sky, he could always soar in the hearts of his fellow Whimsyville inhabitants."

/*
const story = "n the bustling city of Lumina, nestled between skyscrapers and neon-lit streets, there exists a quaint café known as \"Euphoria Brews.\" Its exterior, adorned with cascading ivy and twinkling fairy lights, draws passersby into a world of warmth and charm.\n" +
    "\n" +
    "Stepping through the door, patrons are greeted by the aroma of freshly ground coffee beans mingling with the scent of homemade pastries. The interior is a delightful mishmash of vintage furniture, mismatched teacups, and cozy nooks, inviting guests to linger and unwind.\n" +
    "\n" +
    "At the heart of the café stands a majestic oak bar, where skilled baristas craft exquisite latte art with precision and flair. Each cup tells a story, a canvas of frothy milk and espresso swirls that reflect the passion and creativity of the artisans behind the counter.\n" +
    "\n" +
    "The walls are adorned with local artwork, a rotating gallery that showcases the talent and vibrancy of the community. Soft jazz music fills the air, setting a tranquil backdrop for lively conversations and quiet contemplation alike.\n" +
    "\n" +
    "In one corner, a bookcase overflows with well-loved novels and dog-eared poetry collections, inviting patrons to lose themselves in a literary escape. The gentle hum of conversation mingles with the occasional rustle of pages turning, creating a symphony of serenity.\n" +
    "\n" +
    "As daylight fades, the café transforms into a cozy haven aglow with the soft flicker of candlelight. Friends gather around wooden tables, sharing laughter and stories over steaming cups of cocoa, while couples steal quiet moments in secluded alcoves, lost in each other's company.\n" +
    "\n" +
    "Outside, the city buzzes with life, but within the walls of \"Euphoria Brews,\" time seems to stand still. It's a place where the worries of the world melt away, replaced by the simple joys of good company and delicious brews." +
    " And as the evening draws to a close, patrons depart with contented smiles, already counting down the hours until their next visit to this enchanting oasis in the heart of Lumina."

 */
const documentsToInsert = [new Document({
    pageContent: story
})]
const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 100, // Cantidad de caracteres por fragmento
    chunkOverlap: 30, // Cantidad de caracteres que se superpondrán entre fragmentos
});


const embeddings = new OpenAIEmbeddings({
    apiKey: "empty",
    batchSize: 512,
    configuration: {
        baseURL: "http://localhost:8080/v1",
    }
});


// Función para la inserción de datos en la base de datos
async function insertData(collection, embeddings, splitter, documentsToInsert) {
    const docOutputToInsert = await splitter.splitDocuments(documentsToInsert);
    const pageContents = docOutputToInsert.map(document => document.pageContent);
    const vectors = await embeddings.embedDocuments(pageContents);
    const insertManyResult = await collection.insertMany(vectors.map((vector, index) => ({
        id: index,
        document: docOutputToInsert[index],
        vector
    })));
    console.log(insertManyResult);
}

// Función para la búsqueda vectorial
async function vectorSearch(collection, embeddings, query) {
    const vectorQuery = await embeddings.embedDocuments([query]);
    const agg = [
        {
            '$vectorSearch': {
                'index': 'vector_index',
                'path': 'vector',
                'queryVector': vectorQuery[0],
                'numCandidates': 100,
                'limit': 6
            }
        }, {
            '$project': {
                '_id': 0,
                'id': 1,
                'document.pageContent': 1,
                'score': {
                    '$meta': 'vectorSearchScore'
                }
            }
        }
    ];
    const aggregateResult = collection.aggregate(agg);
    let results = [];
    await aggregateResult.forEach((doc) => {
        console.dir(JSON.stringify(doc));
        results.push(doc);
    });
    return results;
}

// Función para la interacción con el modelo de OpenAI
async function modelInteraction(openai, aggregateResult, query) {
    const completion = await openai.chat.completions.create({
        messages: [{role: "system", content: "This is the context to look for information " + aggregateResult},
            {role: "user", content: query}],
        model: "LLaMA_CPP",
    });
    console.log(completion.choices[0]);
    return completion.choices[0];
}


//await insertData(collection, embeddings, splitter, documentsToInsert);
await vectorSearch(collection, embeddings, "Percy climbed");
//await modelInteraction(openai, searchResults, "What was Percy's desire?");
//console.log(modelOutput.message.content);
await client.close()
