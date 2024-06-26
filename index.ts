/**
 * MIT License
 * 
 * Copyright (c) 2024 Masato Nakatsuji
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import * as fs from "fs";
import * as path from "path";
import { IncomingMessage, ServerResponse } from "http";
import { MinuetServerModuleBase } from "minuet-server";

/**
 * ***DefaultMimes*** : Default MimeType List
 */
export const DefaultMimes = {
    jpg: "image/jpeg",
    png: "image/png",
    gif: "image/jig",
    tif: "image/tiff",
    tiff: "image/tiff",
    svg: "image/svg+xml",
    ico: "image/vnd.microsoft.icon",
    mp3: "audio/mp3",
    aac: "audio/aac",
    txt: "text/plain",
    css: "text/css",
    js : "text/javascript",
    html: "text/html",
    htm: "text/html",
    xml: "text/xml",
    woff: "font/woff",
    woff2 : "font/woff2",
    ttf: "font/ttf",
    zip: "application/zip",
    bz: "application/x-bzip",
    gz: "application/gzip",
    "7z": "application/x-7z-compressed",
    csv: "text/csv",
};

export interface MinuetWebOption {
    /**
     * ***url*** : Subdirectory URL to be published on the server.
     */
    url? : string;

    /**
     * ***rootDir*** : Root directory to deploy as a server.  
     * If not specified, ``htdocs`` is used as the root directory.
     */
    rootDir? : string | {[url : string] : string},

    /**
     * ***mimes*** : List of MIMETypes allowed for deployment by the server.  
     * If not specified, ***DefaultMimes*** will be applied.
     */
    mimes?: Object,

    /**
     * ***headers*** : Response header information.
     */
    headers?: Object,

    /**
     * ***buffering*** : Setting whether to buffer server data.  
     * (The default is ``true``.)
     * 
     * If you select ``true``, when you instantiate or execute the ``setting`` method,  
     * a set of files in the root directory with access permissions for each MimeType will be buffered.  
     * When listening from now on, it will be loaded from the buffer.  
     * 
     * This is done as part of the speedup.  
     * Even if a file in the root directory is changed, the display results will not be updated when listening.
     * 
     * If you select ``false``, no buffer will be created and the file will be loaded every time you listen.  
     */
    buffering? : boolean,

    /**
     * ***bufferingMaxSize*** : Maximum size of buffered file.  
     * (The default is 300KB.)
     */
    bufferingMaxSize? : number,

    /**
     * ***directReading*** : When ``buffering`` is set to ``true``,    
     * this setting determines whether to load and output files   
     * that are not in the buffer but are in the root directory.   
     * (The default is ``false``.)
     */
    directReading? : boolean,

    /**
     * ***notFound** : Settings when the accessed URL (file) does not exist.  
     * Can be specified as a boolean (return value of the ``listen`` method)   
     * or a string (display page file for 404 not Found).  
     * (The default is ``false``.)
     */
    notFound? : string | boolean,

    /**
     * ***directoryIndexs*** : Specifies a list of files to display for a directory request.
     */
    directoryIndexs? : Array<string>,

    /**
     * ***listNavigator*** : Determines whether to display the file/directory list screen when a directory area is specified in the URL.  
     * Displays the list screen when there is no content to display in the URL to the directory.  
     * The default is ``false``.
     */
    listNavigator?: boolean, 

    /**
     * ***logAccess*** : Specify the log output at the time of the request.  
     * Apply the log setting name set in ``minuet-server-logger``.
     */
    logAccess? : string,
}

enum MinuetWebBufferName {
    notFound = "#notfound",
    listNavigator = "#listNavigator",
}

/**
 * ### MinuetWeb
 * A class for listening to a web server for static content.  
 * By combining it with modules such as http, you can easily deploy a static web server.  
 * 
 * Here is a simple example:
 * ```typescript
 * import * as http from "http";
 * import { MinuetWeb } from "minuet-web";
 * 
 * const mw = new MineutWeb();
 * // If you do not specify rootDir,   
 * // the 'htdocs' in the root directory will be automatically buffered   
 * // and made available as static content.
 * 
 * const h = http.createServer((req, res) => {
 *      mw.listen(req, res);
 * });
 * h.listen(8000);
 * ```
 */
export class MinuetWeb {

    /**
     * ***url*** : Subdirectory URL to be published on the server.
     */
    public url : string = "/";

    /**
     * ***rootDir*** : Root directory to deploy as a server.  
     * If not specified, ``htdocs`` is used as the root directory.
     */
    public rootDir : string | {[url : string] : string} = "htdocs";

    /**
     * ***mimes*** : List of MIMETypes allowed for deployment by the server.  
     * If not specified, ***DefaultMimes*** will be applied.
     */
    public mimes : Object = DefaultMimes;

    /**
     * ***headers*** : Response header information.
     */
    public headers : Object = {};

    /**
     * ***buffering*** : Setting whether to buffer server data.  
     * (The default is ``true``.)
     * 
     * If you select ``true``, when you instantiate or execute the ``setting`` method,  
     * a set of files in the root directory with access permissions for each MimeType will be buffered.  
     * When listening from now on, it will be loaded from the buffer.  
     * 
     * This is done as part of the speedup.  
     * Even if a file in the root directory is changed, the display results will not be updated when listening.
     * 
     * If you select ``false``, no buffer will be created and the file will be loaded every time you listen.  
     */
    public buffering : boolean = true;

    /**
     * ***bufferingMaxSize*** : Maximum size of buffered file.  
     * (The default is 300KB. )
     */
    public bufferingMaxSize : number =  300000;

    /**
     * ***directReading*** : When ``buffering`` is set to ``true``,    
     * this setting determines whether to load and output files   
     * that are not in the buffer but are in the root directory.   
     * (The default is ``false``.)
     */
    public directReading : boolean = false;

    /**
     * ***notFound** : Settings when the accessed URL (file) does not exist.  
     * Can be specified as a boolean (return value of the ``listen`` method)   
     * or a string (display page file for 404 not Found).  
     * (The default is ``false``.)
     */
    public notFound : string | boolean= false;

    /**
     * ***directoryIndexs*** : Specifies a list of files to display for a directory request.
     */
    public directoryIndexs : Array<string> = [];

    /**
     * ***listNavigator*** : Determines whether to display the file/directory list screen when a directory area is specified in the URL.  
     * Displays the list screen when there is no content to display in the URL to the directory.  
     * The default is ``false``.
     */
    public listNavigator?: boolean = false;

    /**
     * ***logAccess*** : Specify the log output at the time of the request.  
     * Apply the log setting name set in ``minuet-server-logger``.
     */
    public logAccess? : string;

    private buffers = {};
    public logger;

    /**
     * ***constructor*** : If options are specified, it behaves the same as the setting method.  
     * If ``buffering`` is set to ``true``, the buffer will be created automatically.
     * @param {MinuetWebOption} options Minuet Web Option
     */
    public constructor(options? : MinuetWebOption) {
        if (options) {
            this.setting(options);
        }
        else {
            this.updateBuffer();
        }
    }

    /**
     * ### setting
     * For setting server option information  
     * Mainly used to reset to new option information
     * @param {MinuetWebOption} options Minuet Web Option
     * @returns 
     */
    public setting(options : MinuetWebOption) : MinuetWeb {
        if (options.url != undefined) this.url = options.url;
        if (options.rootDir != undefined) this.rootDir = options.rootDir;
        if (options.mimes != undefined) this.mimes = options.mimes;
        if (options.headers != undefined) this.headers = options.headers;
        if (options.buffering != undefined) this.buffering = options.buffering;        
        if (options.bufferingMaxSize != undefined) this.bufferingMaxSize = options.bufferingMaxSize;
        if (options.directReading != undefined) this.directReading = options.directReading;
        if (options.notFound != undefined) this.notFound = options.notFound;
        if (options.directoryIndexs != undefined) this.directoryIndexs = options.directoryIndexs;
        if (options.listNavigator != undefined) this.listNavigator = options.listNavigator;
        if (options.logAccess != undefined) this.logAccess = options.logAccess;
        this.updateBuffer();
        return this;
    }

    /**
     * addRootDir
     * @param {string} url 
     * @param {string} rootDir 
     */
    public addRootDir(url : string, rootDir : string) {
        if (typeof this.rootDir == "string") {
            this.rootDir = { "/" : this.rootDir };
        }

        this.rootDir[url] = rootDir;

        if(this.buffering) {
            this.search(rootDir, url);
        }
    }


    /**
     * ***updateBuffer*** : Methods for updating buffer information.  
     * Reloads the set of target files from the root directory and updates the buffer information. 
     * @returns {MinuetWeb} 
     */
    public updateBuffer() : MinuetWeb {
        if (this.buffering){
            this.buffers = {};
            if(typeof this.rootDir == "string") {
                this.rootDir = { "/" : this.rootDir };
            }
            const r = Object.keys(this.rootDir);
            for(let n = 0 ; n < r.length ; n++) {
                const url = r[n];
                const rootDir = this.rootDir[url];
                this.search(rootDir, url);
            }

            if (typeof this.notFound == "string"){
                const content = fs.readFileSync(this.notFound.toString());
                this.buffers[MinuetWebBufferName.notFound] = content;
            }
            if (this.listNavigator){
                const content = fs.readFileSync(__dirname + "/listnavigator/index.html");
                this.buffers[MinuetWebBufferName.listNavigator] = content;
            }
        }
        return this;
    }

    /**
     * ***addBuffer*** : Access URL and add buffer from file content.
     * @param {string} filePath Access File URL
     * @param {Buffer} content Contents
     * @returns {MinuetWeb}
     */
    public addBuffer(filePath : string, content : Buffer) : MinuetWeb {
        if (typeof this.rootDir == "string") this.rootDir = { "/" : this.rootDir };
        const c = Object.keys(this.rootDir);
        let fileName;
        for (let n = 0 ; n < c.length ; n++) {
            const burl = c[n];
            const rootDir = this.rootDir[burl];
            if (filePath.indexOf(rootDir) === 0) {
                let url2 = burl;
                if (url2 == "/"){
                    url2 = "";
                }
                fileName = (url2 + filePath.substring(rootDir.length)).split("//").join("/");
            }
        }
        this.buffers[fileName] = content;
        return this;
    }

    private search(targetPath : string, url : string) {
        const target = targetPath;
        const list = fs.readdirSync(target, {
            withFileTypes: true,
        });
        for (let n = 0 ; n < list.length ; n++){
            const l_ = list[n];

            if (l_.isDirectory()){
                this.search(targetPath + "/" + l_.name, url);
            }
            else {
                if (!this.hasMine(l_.name)) continue;
                const filePath = target + "/" + l_.name;
                if (fs.statSync(filePath).size > this.bufferingMaxSize) continue;
                const content = fs.readFileSync(filePath);
                this.addBuffer(filePath, content);
            }
        }
    } 

    private getMime(target : string) : string {
        const ext = path.extname(target).substring(1);
        return this.mimes[ext];
    }

    private hasMine(target : string) : boolean {
        const ext = path.extname(target).substring(1);
        if (!ext) return false;

        if (!this.mimes[ext]){
            return false;
        }
        
        return true;
    }

    private setHeader(res : ServerResponse) : void {
        const c = Object.keys(this.headers);
        for (let n = 0 ; n < c.length ; n++){
            const name = c[n];
            const value = this.headers[name];
            res.setHeader(name, value);
        }
    }

    private readFile(targetPath : string) : {content : Buffer | null, mime : string}  {
        if (this.buffering){
            if (this.buffers[targetPath]) {
                const content = this.buffers[targetPath];
                const mime = this.getMime(targetPath);
                return {
                    content: content,
                    mime : mime,
                };
            }
        }

        if (typeof this.rootDir == "string") this.rootDir = { "/" : this.rootDir };

        const c = Object.keys(this.rootDir);
        let decisionPath;
        for (let n = 0 ; n < c.length ; n++) {
            const burl = c[n];
            const rootDir = this.rootDir[burl];

            let targetFullPath = rootDir + "/" + targetPath.substring(burl.length) ;
            if (this.url != "/") {
                targetFullPath = rootDir + "/" + targetPath.substring(this.url.length).substring(burl.length) ;
            }
            targetFullPath = targetFullPath.split("//").join("/");
            if (fs.existsSync(targetFullPath)) {
                if (fs.statSync(targetFullPath).isFile()){
                    decisionPath = targetFullPath;
                    break;
                }
            }

            for (let n2 = 0 ; n2 < this.directoryIndexs.length ; n2++) {
                const index = this.directoryIndexs[n2];
                let targetFullPath = rootDir + "/" + targetPath.substring(burl.length) + "/" + index;
                if (this.url != "/") {
                    targetFullPath = rootDir + "/" + targetPath.substring(this.url.length).substring(burl.length) + "/" + index;
                }
                targetFullPath = targetFullPath.split("//").join("/");
                if (fs.existsSync(targetFullPath)) {
                    if (fs.statSync(targetFullPath).isFile()) {
                        decisionPath = targetFullPath;
                        break;
                    }
                }
            }
        }

        if (!decisionPath){
            return;
        }

        const content = fs.readFileSync(decisionPath);
        const mime = this.getMime(decisionPath);
        return {
            content: content,
            mime : mime,
        };
    }

    // How to deal with errors (404 not found).
    private error(res: ServerResponse) : boolean {
        if (typeof this.notFound == "boolean") {
            if (!this.notFound) {
                return false;
            }
            res.statusCode = 404;
            res.end();
            return true;
        }
        else {
            try {
                let content;
                if (this.buffering){
                    const notFound = MinuetWebBufferName.notFound;
                    if (!this.buffers[notFound]) {
                        throw Error("Page Not Found");
                    }

                    content = this.buffers[notFound];
                }
                else {
                    content = fs.readFileSync(this.notFound);
                }
      
                res.statusCode = 404;
                res.write(content);
                res.end();

            }catch(error) {
                console.log(error);
                res.write("ERROR");
                res.end();
            }
            return true;
        }
    }

    private getUrl(baseUrl: string) : string {
        let url = baseUrl.split("?")[0];
        if (url != "/" && url[url.length - 1] == "/") {
            url = url.substring(0, url.length- 1);
        }
        let urlList = [];
        for (let n = 0 ; n < this.directoryIndexs.length ; n++){
            const index = this.directoryIndexs[n];
            urlList.push((url + "/" + index).split("//").join("/"));
        }
        let decisionUrl : string = baseUrl;
        for (let n = 0 ; n < urlList.length ; n++){
            const url_ = urlList[n];

            if (this.buffering){
                if(this.buffers[url_]){
                    decisionUrl = url_;
                    break;
                }
                if (!this.directReading) continue;
            }

            if (typeof this.rootDir == "string") this.rootDir = { "/" : this.rootDir };
            const c = Object.keys(this.rootDir);
            let exists = false;
            for (let n2 = 0 ; n2 < c.length ; n2++) {
                const burl = c[n2];
                const rootDir = this.rootDir[burl];
                const existsBuff = fs.existsSync((rootDir + "/" + url_).split("//").join("/"));
                if (existsBuff){
                    exists = true;
                    break;
                }
            }

            if (exists) {
                decisionUrl = url_;
                break;                   
            }
        }
        
        return decisionUrl;        
    }

    private getDirectories(url : string) {
        let res = [];

        if (this.buffering) {
            const bc = Object.keys(this.buffers);
            for (let n = 0 ; n < bc.length ; n++) {
                const file = bc[n];

                if (file.indexOf(url) == 0) {
                    if (file.substring(url.length).split("/").length == 2) {
                        res.push(file);
                    }
                }
            }
        }
        else {
            // comming soon...
        }

        return res;
    }

    private isDirectory(req :IncomingMessage, res : ServerResponse) : boolean {
        let url = req.url.split("?")[0];
        if (url[url.length - 1] == "/") {
            url = url.substring(0, url.length - 1);
        }
        if (this.buffering){
            let content = this.buffers[MinuetWebBufferName.listNavigator].toString();
            content = content.split("{url}").join(url);
            content = content.split("{back}").join(path.dirname(url));
            const list = this.getDirectories(url);
            let listStr = "";
            for (let n = 0 ; n < list.length ; n++) {
                const l_ = list[n];
                const td = "<tr><td>-</td><td><a href=\"" + l_ + "\">" + path.basename(l_) + "</a></td></tr>";
                listStr += td;
            }
            content = content.split("{lists}").join(listStr);
            const d_ = new Date();
            const nowDate = d_.getFullYear() + "/" + ("0" + (d_.getMonth() + 1)).slice(-2) + "/" + ("0" + d_.getDate()).slice(-2)
                            + " " + ("0" + d_.getHours()).slice(-2) + ":" + ("0" + d_.getMinutes()).slice(-2) + ":" + ("0" + d_.getSeconds()).slice(-2);
            content = content.split("{comment}").join("Minuet Server | " + nowDate);
            res.write(content);
            res.end();
        }
        else {
            // comming soon...
        }

        return true;
    }

    /**
     * ***listen*** : Proxy processing when the server listens.
     * Here, based on the request URL,   
     * buffer information or a file from the root directory is loaded,  
     * and judgment processing or response control is performed.
     * @param {IncomingMessage} req http.IncomingMessage
     * @param {ServerResponse} res http.ServerResponse
     * @returns {boolean} judgment result
     */
    public listen(req :IncomingMessage, res : ServerResponse ) : boolean {
        const url0 = req.url.split("?")[0];
        let url = this.getUrl(url0);
        if (!url){
            if (this.listNavigator && this.isDirectory(req, res)){
                return true
            }
            return this.error(res);
        }

        let buff;
        try {
            buff = this.readFile(url);
            if (!buff) throw Error("page not found");
            if (!buff.mime) throw Error("not supported mime type");
        }catch(err){
            return this.error(res);
        }

        res.statusCode = 200;
        this.headers["content-type"] = buff.mime;
        this.setHeader(res);
        res.write(buff.content);
        res.end();

        // access log write
        this.log(this.logAccess, req, res);

        return true;
    }

    // log write
    private log(logMode : string, req : IncomingMessage, res : ServerResponse, message? : string) {
        if (!logMode) return;
        if (this.logger) {
            if (typeof logMode == "string") {
                this.logger.write(logMode, req, res, message);
            }
        }
    }
}

export class MinuetServerModuleWeb extends MinuetServerModuleBase {
    
    public web : MinuetWeb;

    public onBegin(){
        if (!this.init) {
            this.init = {};
        }
        this.init.rootDir = this.sector.root + "/" + this.init.rootDir,
        this.web = new MinuetWeb(this.init);

        // load logger module
        const logger = this.getModule("logger");
        if (logger) {
            this.web.logger = logger;
        }
    }

    public async onListen(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
        try {
            return await this.web.listen(req, res);
        }catch(err){
            return;
        }
    }

}