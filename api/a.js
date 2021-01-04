("use strict");

const prompt = require("prompt-sync")();
const AssistantV2 = require("ibm-watson/assistant/v2");
const { IamAuthenticator } = require("ibm-watson/auth");
var kindOfFood;
var can = false;

const service = new AssistantV2({
  version: "2020-05-28",
  authenticator: new IamAuthenticator({
    apikey: "AoMdDOTzXlcZjC0W48GoV06c5xrjLVkg_Hakhkwgg_y4",
  }),
  url: "https://api.us-south.assistant.watson.cloud.ibm.com",
});

const assistantId = "ee4a36a1-08a6-4afd-8d89-5bd5a00798a5";
let sessionId;

const parse = require("csv-parse");
const fs = require("fs");
var transform = require("stream-transform");
var cityName;
var kindOfFood;
var parser = parse({ delimiter: "," });
var cnt = 0;

var input = fs.createReadStream("data.csv", { encoding: "utf-8" }); //파일명, 기본은 utf-8

function fn_test(record) {
  if (record[0] === kindOfFood) {
    if (record[4] === cityName) {
      console.log(
        `이름 : ${record[1]} 대표매뉴 : ${record[7]}  가격 : ${record[8]}  주소 : ${record[5]}`
      );
    }
  }
}

var transformer = transform(function (record, callback) {
  if (cnt < 10 && cnt != 0) {
    callback(fn_test(record));
  }
  cnt++;
});

service
  .createSession({
    assistantId,
  })
  .then((res) => {
    sessionId = res.result.session_id;
    sendMessage({
      messageType: "text",
      text: "",
    }); // start conversation with empty message
  })
  .catch((err) => {
    console.log(err); // something went wrong
  });

// Send message to assistant.
function sendMessage(messageInput) {
  service
    .message({
      assistantId,
      sessionId,
      input: messageInput,
    })
    .then((res) => {
      processResponse(res.result);
    })
    .catch((err) => {
      console.log(err); // something went wrong
    });
}

// Process the response.
function processResponse(response) {
  // If an intent was detected, log it out to the console.
  if (response.output.intents.length > 0) {
    console.log("Detected intent: #" + response.output.intents[0].intent);
  } else if (response.output.entities.length > 0) {
    console.log("Detected entity: @" + response.output.entities[0].entity);

    if (response.output.entities[0].entity === "세부위치엔티티") {
      cityName = response.output.entities[0].value;
    }

    if (response.output.entities[0].entity === "업종") {
      kindOfFood = response.output.entities[0].value;
      input.pipe(parser).pipe(transformer).pipe(process.stdout);
    }
  }
  // Display the output from assistant, if any. Supports only a single
  // text response.
  if (response.output.generic) {
    if (response.output.generic.length > 0) {
      if (response.output.generic[0].response_type === "text") {
        console.log(response.output.generic[0].text);
      }
    }
  }

  // Prompt for the next round of input.
  const newMessageFromUser = prompt(">> ");
  if (newMessageFromUser === "quit") {
    service
      .deleteSession({
        assistantId,
        sessionId,
      })
      .catch((err) => {
        console.log(err); // something went wrong
      });
    return;
  }

  newMessageInput = {
    messageType: "text",
    text: newMessageFromUser,
  };

  sendMessage(newMessageInput);
}
