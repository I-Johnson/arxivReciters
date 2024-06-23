import { SupabaseClient, createClient } from '@supabase/supabase-js';
import {Database } from "generated/db.js"
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { SupabaseVectorStore } from 'langchain/vectorstores/supabase';
import { Document } from 'langchain/document';

export const ARXIV_EMBEDDINGS_TABLE = "arxiv_embeddings";

export class SupabaseDatabase{
    vectorStore: SupabaseVectorStore;

    client: SupabaseClient<Database, 'public', any>;

    constructor(
        client: SupabaseClient<Database, 'public', any>, 
        vectorStore: SupabaseVectorStore
    ) {
            this.client = client;
            this.vectorStore = vectorStore;
        }
    

    static async fromDocuments(
        documents: Array<Document>
    ): Promise<SupabaseDatabase>{
        const privateKey = process.env.SUPABASE_PRIVATE_KEY;
        const supabaseUrl = process.env.SUPABASE_URL;
        if (!privateKey || !supabaseUrl) {
            throw new Error('Supabase credentials not found');
        }

        const supabase = createClient<Database> (supabaseUrl, privateKey);
        const vectorStore = await SupabaseVectorStore.fromDocuments(
            documents,
            new OpenAIEmbeddings(),
            {
                client: supabase, 
                tableName: ARXIV_EMBEDDINGS_TABLE,
                queryName: "match_documents"
            }

        );
        return new this(supabase, vectorStore);
    }
}