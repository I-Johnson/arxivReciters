import axios from 'axios'
import { PDFDocument} from 'pdf-lib';
import { Document } from 'langchain/document';
import { writeFile, unlink  } from 'fs/promises';
import { UnstructuredLoader } from 'langchain/document_loaders/fs/unstructured';

async function deletePages(pdf: Buffer, pagesToDelete: number[]): Promise<Buffer> {
    const pdfDoc = await PDFDocument.load(pdf);
    let numToOffsetBy = 1;
    for (const pageNum of pagesToDelete) {
        pdfDoc.removePage(pageNum - numToOffsetBy);
        numToOffsetBy++;
    }
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
}

async function loadpdfFromUrl(url: string): Promise<Buffer> {
    const response = await axios.get(url, {
        responseType: 'arraybuffer', 
    }); 
    return response.data;
}

/**
 * This function converts a PDF file into an array of Document objects.
 * 
 * @param {Buffer} pdf - The PDF file to be converted, represented as a Buffer.
 * @returns {Promise<Array<Document>>} - A Promise that resolves to an array of Document objects.
 * An instance of UnstructuredLoader is created with the file path of the PDF and the API key.
 * The loader then loads the PDF and converts it into an array of Document objects.
 * After the conversion, the PDF file is deleted from the system.
 * The function returns a Promise that resolves to the array of Document objects.
 */
async function convertPdfToDocument(pdf: Buffer): Promise<Array<Document>> {
    if (!process.env.UNSTRUCTURED_API_KEY) {
        throw new Error('Unstructured API key not found');
    }
    const randomName = Math.random().toString(36).substring(7);
    await writeFile(`pdfs/${randomName}.pdf`, pdf, 'binary');
    const loader = new UnstructuredLoader(`pdfs/${randomName}.pdf`, {
        apiKey: process.env.UNSTRUCTURED_API_KEY, 
        strategy: 'hi_res'
    });
    const documents = await loader.load();
    await unlink(`pdfs/${randomName}.pdf`);
    return documents;
}

async function main({
    paperUrl, 
    name, 
    pagesToDelete
}: {
    paperUrl: string
    name: string
    pagesToDelete?: number[]
}) {
    if (!paperUrl.endsWith('.pdf')) {
        throw new Error('Not a pdf file');
    }
    let pdfAsBuffer = await loadpdfFromUrl(paperUrl);
    if (pagesToDelete && pagesToDelete.length > 0) {
        // Delete pages if asked
        pdfAsBuffer = await deletePages(pdfAsBuffer, pagesToDelete);
    }
    // Convert the pdf to Document objects (langchain's internal representation of documents)
    const documents = await convertPdfToDocument(pdfAsBuffer);
    console.log(documents);;
    console.log('length:', documents.length);
}

main({paperUrl: 'https://arxiv.org/pdf/2305.15334.pdf', name: 'test'})