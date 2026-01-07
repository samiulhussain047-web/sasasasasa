import { exec } from "child_process";

function openInBrowser(url) {
  return new Promise((resolve, reject) => {
    let cmd;
    if (process.platform === "win32") {
      cmd = `start "" "${url}"`;
    } else if (process.platform === "darwin") {
      cmd = `open "${url}"`;
    } else {
      cmd = `xdg-open "${url}"`;
    }

    exec(cmd, (err) => (err ? reject(err) : resolve()));
  });
}

class Sparx {
  constructor(options = {}) {
    // Try to pull slug from options.school.slug or options.schoolSlug
    this.schoolSlug =
      options.school?.slug ||
      options.schoolSlug ||
      "holte-school"; // <- change if needed
  }

  async login() {
    const url = `https://www.sparxmaths.uk/student/?s=${encodeURIComponent(
      this.schoolSlug
    )}`;

    console.log("Opening Sparx in your browser:");
    console.log(url);
    await openInBrowser(url);
    console.log("Please log in manually in the browser.");
  }

  // Stub methods so other code doesn't crash,
  // but they don't actually do anything.
  async logout() {
   
  }

  async _refreshToken() {
    console.log("Manual mode: no token refresh (you logged in yourself).");
  }
}
    async getHomeworks() {
        const homeworkTasksRequestUrl = `https://studentapi.api.sparxmaths.uk/sparx.swworker.v1.Sparxweb/GetPackageData`;
        const bodyBuffer = Buffer.from('AAAAAAQQARgB', 'base64');

        const homeworkTasksResponse = await fetch(
            homeworkTasksRequestUrl,
            {
                method: "POST",
                headers: {
                    "Authorization": this.token,
                    "Cookie": this._getCookies(),
                    "Content-Type": "application/grpc-web+proto",
                    "x-grpc-web": "1",
                    "x-server-offset": "0",
                    "x-session-id": this.sessionId,
                },
                body: bodyBuffer,
            }
        );
        
        if (homeworkTasksResponse.status !== 200) {
            throw new Error("Failed to get homeworks.");
        }

        if (homeworkTasksResponse.headers.get("grpc-status") !== null) {
            throw new Error("Failed to get homeworks with status " + homeworkTasksResponse.headers.get("grpc-status"));
        }

        const homeworkTasks = await homeworkTasksResponse.blob();
        const completeDecodedProto = decodeProtoRecursive(Buffer.from(await homeworkTasks.arrayBuffer()));

        const homeworks = [];
        
        for (const sPackage of completeDecodedProto) {
            /** @type {any[]} */
            const packageValue = sPackage.value;
            
            if (!Array.isArray(packageValue)) continue;
            // if (packageValue.find(value => value.index == 5)?.value != 'homework') continue;

            const homework = new Homework(
                this,
                packageValue.find(value => value.index === 1).value,
                new Date(parseInt(packageValue.find(value => value.index === 2).value[0].value) * 1000),
                new Date(parseInt(packageValue.find(value => value.index === 3).value[0].value) * 1000),
                packageValue.find(value => value.index === 4).value,
                parseInt(packageValue.find(value => value.index === 6)?.value),
                parseInt(packageValue.find(value => value.index === 7)?.value),
                parseInt(packageValue.find(value => value.index === 8)?.value),
                parseInt(packageValue.find(value => value.index === 9)?.value),
                parseInt(packageValue.find(value => value.index === 10)?.value),
            );

            homeworks.push(homework);
        }

        homeworks.sort((a, b) => a.dueDate - b.dueDate);

        return homeworks;
    }

    async getHomeworkTasks(homeworkId) {
        const b64HomeworkId = Buffer.from(homeworkId).toString('base64');

        const homeworkTasksRequestUrl = `https://studentapi.api.sparxmaths.uk/sparx.swworker.v1.Sparxweb/GetPackageData`;
        const bodyBuffer = Buffer.from('AAAAACggATIk' + b64HomeworkId, 'base64');

        const homeworkTasksResponse = await fetch(
            homeworkTasksRequestUrl,
            {
                method: "POST",
                headers: {
                    "Authorization": this.token,
                    "Cookie": this._getCookies(),
                    "Content-Type": "application/grpc-web+proto",
                    "x-grpc-web": "1",
                    "x-server-offset": "0",
                    "x-session-id": this.sessionId,
                },
                body: bodyBuffer,
            }
        );
        
        if (homeworkTasksResponse.status !== 200) {
            throw new Error("Failed to get homework tasks.");
        }

        if (homeworkTasksResponse.headers.get("grpc-status") !== null) {
            throw new Error("Failed to get homework tasks with status " + homeworkTasksResponse.headers.get("grpc-status"));
        }

        const homeworkTasks = await homeworkTasksResponse.blob();
        const completeDecodedProto = decodeProtoRecursive(Buffer.from(await homeworkTasks.arrayBuffer()));

        const tasks = [];
        
        for (const sTask of completeDecodedProto) {
            if (sTask.index !== 2) continue;

            /** @type {any[]} */
            const taskValue = sTask.value;
            
            if (!Array.isArray(taskValue)) continue;

            const task = new HomeworkTask(
                this,
                taskValue.find(value => value.index === 1).value,
                parseInt(taskValue.find(value => value.index === 2).value),
                taskValue.find(value => value.index === 3).value,
                parseInt(taskValue.find(value => value.index === 6)?.value),
                parseInt(taskValue.find(value => value.index === 7)?.value),
                taskValue.find(value => value.index === 8)?.value == '1',
            );

            tasks.push(task);
        }

        return tasks;
    }

    async getTaskActivities(packageId, taskIndex) {
        const bodyProto = [
            {
                index: 5,
                type: TYPES.VARINT,
                value: 1,
            },
            {
                index: 6,
                type: TYPES.LENDELIM,
                value: packageId,
            },
            {
                index: 7,
                type: TYPES.VARINT,
                value: taskIndex,
            },
        ];
        const encodedBody = encodeProto(bodyProto);
        const headerBuffer = Buffer.alloc(5);
        headerBuffer.writeUInt32BE(encodedBody.length, 1);
        const fullBuffer = Buffer.concat([headerBuffer, encodedBody]);

        const homeworkTasksRequestUrl = `https://studentapi.api.sparxmaths.uk/sparx.swworker.v1.Sparxweb/GetPackageData`;

        const homeworkTasksResponse = await fetch(
            homeworkTasksRequestUrl,
            {
                method: "POST",
                headers: {
                    "Authorization": this.token,
                    "Cookie": this._getCookies(),
                    "Content-Type": "application/grpc-web+proto",
                    "x-grpc-web": "1",
                    "x-server-offset": "0",
                    "x-session-id": this.sessionId,
                },
                body: fullBuffer,
            }
        );

        if (homeworkTasksResponse.status !== 200) {
            throw new Error("Failed to get homework tasks.");
        }

        if (homeworkTasksResponse.headers.get("grpc-status") !== null) {
            throw new Error("Failed to get homework tasks with status " + homeworkTasksResponse.headers.get("grpc-status"));
        }

        const homeworkTasks = await homeworkTasksResponse.blob();
        const completeDecodedProto = decodeProtoRecursive(Buffer.from(await homeworkTasks.arrayBuffer()));

        const activityMeta = [];
        
        for (const sTask of completeDecodedProto) {
            if (sTask.index !== 3) continue;

            /** @type {any[]} */
            const taskValue = sTask.value;
            
            if (!Array.isArray(taskValue)) continue;

            const meta = {
                activityIndex: parseInt(taskValue.find(value => value.index === 3)?.value),
                completed: parseInt(taskValue.find(value => value.index === 4)?.value) == 1,
                name: taskValue.find(value => value.index === 9)?.value,
            };

            activityMeta.push(meta);
        }

        return activityMeta;
    }

    async getActivity(packageId, taskIndex, activityIndex, isFirst = true) {
        const timestamp = new Date(Date.now() - Math.random() * 6 * 60000);
        const bodyProto = [
            {
                index: 2,
                type: TYPES.LENDELIM,
                value: [
                    {
                        index: 1,
                        type: TYPES.LENDELIM,
                        value: packageId,
                    },
                    {
                        index: 2,
                        type: TYPES.VARINT,
                        value: taskIndex,
                    },
                    {
                        index: 3,
                        type: TYPES.VARINT,
                        value: activityIndex,
                    }
                ],
            },
            {
                index: 4,
                type: TYPES.LENDELIM,
                value: [
                    {
                        index: 1,
                        type: TYPES.VARINT,
                        value: Math.floor(timestamp / 1000),
                    },
                    {
                        index: 2,
                        type: TYPES.VARINT,
                        value: timestamp.getMilliseconds() * 1000000,
                    }
                ],
            }
        ];
        const encodedBody = encodeProto(bodyProto);
        const headerBuffer = Buffer.alloc(5);
        headerBuffer.writeUInt32BE(encodedBody.length, 1);
        const fullBuffer = Buffer.concat([headerBuffer, encodedBody]);

        const activitiesRequestUrl = `https://studentapi.api.sparxmaths.uk/sparx.swworker.v1.Sparxweb/GetActivity`;

        const activitiesResponse = await fetch(
            activitiesRequestUrl,
            {
                method: "POST",
                headers: {
                    "Authorization": this.token,
                    "Cookie": this._getCookies(),
                    "Content-Type": "application/grpc-web+proto",
                    "x-grpc-web": "1",
                    "x-server-offset": "0",
                    "x-session-id": this.sessionId,
                },
                body: fullBuffer,
            }
        );
        
        if (activitiesResponse.status !== 200) {
            throw new Error("Failed to get homework tasks.");
        }

        if (activitiesResponse.headers.get("grpc-status") !== null) {
            if (activitiesResponse.headers.get("grpc-status") == '9') {
                if (isFirst) {
                    const bookworkSuccess = await this.completeBookworkCheck(packageId, taskIndex, activityIndex);

                    if (bookworkSuccess) {
                        return this.getActivity(packageId, taskIndex, activityIndex, false);
                    }
                }
                
                throw new Error("Automatic bookwork completion failed.");
            }

            throw new Error("Failed to get homework tasks with status " + activitiesResponse.headers.get("grpc-status"));
        }

        const activity = await activitiesResponse.blob();
        const completeDecodedProto = decodeProtoRecursive(Buffer.from(await activity.arrayBuffer()));
        const infoValue = completeDecodedProto.find(value => value.index === 3).value;

        const activityObj = new Activity(
            this,
            taskIndex,
            parseInt(completeDecodedProto.find(value => value.index === 1).value),
            infoValue.find(value => value.index === 2)?.value,
            infoValue.find(value => value.index === 4)?.value,
            JSON.parse(infoValue.find(value => value.index === 3)?.value),
        );

        return activityObj;
    }

    async registerActivityStart(activityIndex) {
        const timestamp = new Date(Date.now() - Math.random() * 6 * 60000);
        const bodyProto = [
            {
                index: 1,
                type: TYPES.VARINT,
                value: activityIndex,
            },
            {
                index: 2,
                type: TYPES.LENDELIM,
                value: [
                    {
                        index: 1,
                        type: TYPES.VARINT,
                        value: Math.floor(timestamp / 1000),
                    },
                    {
                        index: 2,
                        type: TYPES.VARINT,
                        value: timestamp.getMilliseconds() * 1000000,
                    }
                ],
            },
            {
                index: 4,
                type: TYPES.LENDELIM,
                value: [
                    {
                        index: 1,
                        type: TYPES.VARINT,
                        value: activityIndex,
                    },
                ],
            }
        ];
        const encodedBody = encodeProto(bodyProto);
        const headerBuffer = Buffer.alloc(5);
        headerBuffer.writeUInt32BE(encodedBody.length, 1);
        const fullBuffer = Buffer.concat([headerBuffer, encodedBody]);

        const registerRequestUrl = `https://studentapi.api.sparxmaths.uk/sparx.swworker.v1.Sparxweb/ActivityAction`;

        const registerResponse = await fetch(
            registerRequestUrl,
            {
                method: "POST",
                headers: {
                    "Authorization": this.token,
                    "Cookie": this._getCookies(),
                    "Content-Type": "application/grpc-web+proto",
                    "x-grpc-web": "1",
                    "x-server-offset": "0",
                    "x-session-id": this.sessionId,
                },
                body: fullBuffer,
            }
        );

        if (registerResponse.status !== 200) {
            throw new Error("Failed to register activity start.");
        }

        if (registerResponse.headers.get("grpc-status") !== null) {
            throw new Error("Failed to register activity start with status " + registerResponse.headers.get("grpc-status"));
        }
    }

    async submitAnswer(homework, activityIndex, answers, bookworkCode) {
        const timestamp = new Date(Date.now());

        const answersProto = [];
        for (const [key, value] of Object.entries(answers)) {
            answersProto.push({
                index: 1,
                type: TYPES.LENDELIM,
                value: [
                    {
                        index: 1,
                        type: TYPES.LENDELIM,
                        value: key.toString(),
                    },
                    {
                        index: 2,
                        type: TYPES.LENDELIM,
                        value: value.toString(),
                    }
                ],
            });
        }

        const bodyProto = [
            {
                index: 1,
                type: TYPES.VARINT,
                value: activityIndex,
            },
            {
                index: 2,
                type: TYPES.LENDELIM,
                value: [
                    {
                        index: 1,
                        type: TYPES.VARINT,
                        value: Math.floor(timestamp.getTime() / 1000),
                    },
                    {
                        index: 2,
                        type: TYPES.VARINT,
                        value: timestamp.getMilliseconds() * 1000000,
                    }
                ],
            },
            {
                index: 4,
                type: TYPES.LENDELIM,
                value: [
                    {
                        index: 1,
                        type: TYPES.VARINT,
                        value: activityIndex,
                    },
                    {
                        index: 3,
                        type: TYPES.VARINT,
                        value: 1,
                    },
                    {
                        index: 4,
                        type: TYPES.LENDELIM,
                        value: answersProto,
                    },
                ],
            }
        ];
        const encodedBody = encodeProto(bodyProto);
        const headerBuffer = Buffer.alloc(5);
        headerBuffer.writeUInt32BE(encodedBody.length, 1);
        const fullBuffer = Buffer.concat([headerBuffer, encodedBody]);

        const answerRequestUrl = `https://studentapi.api.sparxmaths.uk/sparx.swworker.v1.Sparxweb/ActivityAction`;

        const answerResponse = await fetch(
            answerRequestUrl,
            {
                method: "POST",
                headers: {
                    "Authorization": this.token,
                    "Cookie": this._getCookies(),
                    "Content-Type": "application/grpc-web+proto",
                    "x-grpc-web": "1",
                    "x-server-offset": "0",
                    "x-session-id": this.sessionId,
                },
                body: fullBuffer,
            }
        );

        if (answerResponse.status !== 200) {
            throw new Error("Failed to submit answer.");
        }

        if (answerResponse.headers.get("grpc-status") !== null) {
            throw new Error("Failed to submit answer with status " + answerResponse.headers.get("grpc-status"));
        }

        const answer = await answerResponse.blob();
        const completeDecodedProto = decodeProtoRecursive(Buffer.from(await answer.arrayBuffer()));
        // console.log(Buffer.from(await answer.arrayBuffer()).toString('base64'));

        const resultInfo = completeDecodedProto.find(value => value.index === 1).value;
        const answersCorrect = resultInfo.find(value => value.index === 2).value == "SUCCESS";

        if (!answersCorrect) {
            return false;
        }

        const bookworkCheckXml = resultInfo.find(value => value.index === 6).value;

        if (!fs.existsSync("bookwork")) {
            fs.mkdirSync("bookwork");
        }

        const existingBookworkJson = fs.existsSync(`bookwork/${homework.id}.json`) ? JSON.parse(fs.readFileSync(`bookwork/${homework.id}.json`)) : {};

        existingBookworkJson[bookworkCode] = bookworkCheckXml;

        fs.writeFileSync(`bookwork/${homework.id}.json`, JSON.stringify(existingBookworkJson, null, 4));

        return true;
    }

    async getBookworkCheck(packageId, taskIndex, activityIndex) {
        const timestamp = new Date(Date.now());

        const bodyProto = [
            {
                index: 1,
                type: TYPES.VARINT,
                value: 1,
            },
            {
                index: 2,
                type: TYPES.LENDELIM,
                value: [
                    {
                        index: 1,
                        type: TYPES.LENDELIM,
                        value: packageId,
                    },
                    {
                        index: 2,
                        type: TYPES.VARINT,
                        value: taskIndex,
                    },
                    {
                        index: 3,
                        type: TYPES.VARINT,
                        value: activityIndex,
                    }
                ],
            },
            {
                index: 4,
                type: TYPES.LENDELIM,
                value: [
                    {
                        index: 1,
                        type: TYPES.VARINT,
                        value: Math.floor(timestamp.getTime() / 1000),
                    },
                    {
                        index: 2,
                        type: TYPES.VARINT,
                        value: timestamp.getMilliseconds() * 1000000,
                    }
                ],
            },
        ];
        const encodedBody = encodeProto(bodyProto);
        const headerBuffer = Buffer.alloc(5);
        headerBuffer.writeUInt32BE(encodedBody.length, 1);
        const fullBuffer = Buffer.concat([headerBuffer, encodedBody]);

        const activitiesRequestUrl = `https://studentapi.api.sparxmaths.uk/sparx.swworker.v1.Sparxweb/GetActivity`;

        const activitiesResponse = await fetch(
            activitiesRequestUrl,
            {
                method: "POST",
                headers: {
                    "Authorization": this.token,
                    "Cookie": this._getCookies(),
                    "Content-Type": "application/grpc-web+proto",
                    "x-grpc-web": "1",
                    "x-server-offset": "0",
                    "x-session-id": this.sessionId,
                },
                body: fullBuffer,
            }
        );
        
        if (activitiesResponse.status !== 200) {
            throw new Error("Failed to get bookwork check.");
        }

        if (activitiesResponse.headers.get("grpc-status") !== null) {
            return null;
        }

        const activity = await activitiesResponse.blob();
        const completeDecodedProto = decodeProtoRecursive(Buffer.from(await activity.arrayBuffer()));

        return completeDecodedProto;
    }

    async registerBookworkCheckStart() {
        const timestamp = new Date(Date.now() - Math.random() * 6 * 60000);
        const bodyProto = [
            {
                index: 1,
                type: TYPES.VARINT,
                value: 1,
            },
            {
                index: 2,
                type: TYPES.LENDELIM,
                value: [
                    {
                        index: 1,
                        type: TYPES.VARINT,
                        value: Math.floor(timestamp / 1000),
                    },
                    {
                        index: 2,
                        type: TYPES.VARINT,
                        value: timestamp.getMilliseconds() * 1000000,
                    }
                ],
            },
            {
                index: 6,
                type: TYPES.LENDELIM,
                value: [],
            }
        ];
        const encodedBody = encodeProto(bodyProto);
        const headerBuffer = Buffer.alloc(5);
        headerBuffer.writeUInt32BE(encodedBody.length, 1);
        const fullBuffer = Buffer.concat([headerBuffer, encodedBody]);

        const registerRequestUrl = `https://studentapi.api.sparxmaths.uk/sparx.swworker.v1.Sparxweb/ActivityAction`;

        const registerResponse = await fetch(
            registerRequestUrl,
            {
                method: "POST",
                headers: {
                    "Authorization": this.token,
                    "Cookie": this._getCookies(),
                    "Content-Type": "application/grpc-web+proto",
                    "x-grpc-web": "1",
                    "x-server-offset": "0",
                    "x-session-id": this.sessionId,
                },
                body: fullBuffer,
            }
        );

        if (registerResponse.status !== 200) {
            throw new Error("Failed to register bookwork start.");
        }

        if (registerResponse.headers.get("grpc-status") !== null) {
            throw new Error("Failed to register bookwork start with status " + registerResponse.headers.get("grpc-status"));
        }
    }

    async sendBookworkCheck(bookworkParts, bookworkXml) {
        const timestamp = new Date(Date.now());

        const bodyProto = [
            {
                index: 1,
                type: TYPES.VARINT,
                value: 1,
            },
            {
                index: 2,
                type: TYPES.LENDELIM,
                value: [
                    {
                        index: 1,
                        type: TYPES.VARINT,
                        value: Math.floor(timestamp.getTime() / 1000),
                    },
                    {
                        index: 2,
                        type: TYPES.VARINT,
                        value: timestamp.getMilliseconds() * 1000000,
                    }
                ],
            },
            {
                index: 6,
                type: TYPES.LENDELIM,
                value: [
                    {
                        index: 3,
                        type: TYPES.VARINT,
                        value: 1,
                    },
                    {
                        index: 4,
                        type: TYPES.LENDELIM,
                        value: bookworkParts,
                    },
                    {
                        index: 5,
                        type: TYPES.LENDELIM,
                        value: [
                            {
                                index: 1,
                                type: TYPES.LENDELIM,
                                value: "answerMarkup",
                            },
                            {
                                index: 2,
                                type: TYPES.LENDELIM,
                                value: bookworkXml,
                            }
                        ],
                    }
                ],
            },
        ];
        const encodedBody = encodeProto(bodyProto);
        const headerBuffer = Buffer.alloc(5);
        headerBuffer.writeUInt32BE(encodedBody.length, 1);
        const fullBuffer = Buffer.concat([headerBuffer, encodedBody]);

        const answerRequestUrl = `https://studentapi.api.sparxmaths.uk/sparx.swworker.v1.Sparxweb/ActivityAction`;

        const answerResponse = await fetch(
            answerRequestUrl,
            {
                method: "POST",
                headers: {
                    "Authorization": this.token,
                    "Cookie": this._getCookies(),
                    "Content-Type": "application/grpc-web+proto",
                    "x-grpc-web": "1",
                    "x-server-offset": "0",
                    "x-session-id": this.sessionId,
                },
                body: fullBuffer,
            }
        );

        if (answerResponse.status !== 200) {
            throw new Error("Failed to submit bookwork check.");
        }

        if (answerResponse.headers.get("grpc-status") !== null) {
            throw new Error("Failed to submit bookwork check with status " + answerResponse.headers.get("grpc-status"));
        }

        const answer = await answerResponse.blob();
        const completeDecodedProto = decodeProtoRecursive(Buffer.from(await answer.arrayBuffer()));

        return completeDecodedProto.find(value => value.index === 1).value.find(value => value.index === 2).value == "SUCCESS";
    }

    async completeBookworkCheck(packageId, taskIndex, activityIndex) {
        if (!fs.existsSync(`bookwork/${packageId}.json`)) {
            return;
        }

        const bookworkStore = JSON.parse(fs.readFileSync(`bookwork/${packageId}.json`));

        const bookworkCheckProto = await this.getBookworkCheck(packageId, taskIndex, activityIndex);
        if (!bookworkCheckProto) return;

        try {
            await this.registerBookworkCheckStart();
        } catch (err) {
            // do nothing
        }
        
        const bookworkInfo = bookworkCheckProto.find(value => value.index === 5).value;
        const bookworkOptions = bookworkInfo.filter(value => value.index === 6);

        const bookworkXml = bookworkStore[bookworkInfo.find(value => value.index === 4).value];

        const correctBookwork = bookworkOptions.find(value => value.value.find(option => option.index === 2).value == bookworkXml).value;
        const correctBookworkParts = correctBookwork.find(option => option.index === 1).value;

        const bookworkCorrect = await this.sendBookworkCheck(correctBookworkParts, bookworkXml);

        return bookworkCorrect;
    }
}

export { Sparx };