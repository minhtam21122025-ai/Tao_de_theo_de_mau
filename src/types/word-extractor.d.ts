declare module 'word-extractor' {
  export interface WordDocument {
    getBody(): string;
    getFootnotes(): string;
    getHeaders(): string;
    getFooters(): string;
    getAnnotations(): string;
  }
  export default class WordExtractor {
    constructor();
    extract(source: string | Buffer): Promise<WordDocument>;
  }
}
