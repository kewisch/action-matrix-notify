import core from "@actions/core";
import showdown from "showdown";


const homeserver = core.getInput("matrixHomeserver");
const roomId = core.getInput("matrixRoomId", { required: true });
const token = core.getInput("matrixToken", { required: true });

const converter = new showdown.Converter();
const message = core.getInput("message", { required: true });

let formattedMessage = converter.makeHtml(message);

const replaceUserInput = core.getInput("replaceUserMap");
if (replaceUserInput) {
  const replaceUserMap = JSON.parse(replaceUserInput);
  formattedMessage = formattedMessage.replace(/@([a-zA-Z0-9-]+)/, (orig, user) => {
    if (user in replaceUserMap) {
      const mxid = replaceUserMap[user];
      console.log(mxid);
      return `<a href="https://matrix.to/#/${encodeURIComponent(mxid)}">${mxid}</a>`;
    }
    return orig;
  });
}


const matrixUrl =
  `https://${homeserver}/_matrix/client/r0/rooms/${encodeURIComponent(roomId)}` +
  `/send/m.room.message?access_token=${encodeURIComponent(token)}`;

console.log("Sending message: " + formattedMessage);

const response = await fetch(matrixUrl, {
  method: "POST",
  body: JSON.stringify({
    msgtype: "m.notice",
    format: "org.matrix.custom.html",
    formatted_body: formattedMessage,
    body: message
  })
});

if (response.ok) {
  let data = await response.json();
  core.setOutput("matrixEventId", data.event_id);
} else {
  console.error(`${response.status} ${response.statusText}`);
  console.error(await response.text());
  core.setFailed(`Matrix request failed with ${response.status}`);
}
