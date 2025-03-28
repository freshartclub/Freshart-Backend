const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function generateInviteCode(inviterId, inviteCode) {
  if (!inviterId || inviterId.length !== 8) {
    throw new Error("Inviter ID must be 8 characters");
  }
  if (!inviteCode || inviteCode.length !== 4) {
    throw new Error("Invite code must be 4 characters");
  }

  const randomGroup = generateRandomString(4);
  const id = [inviterId.substring(0, 4), inviterId.substring(4, 8)].join("-");
  const fullCode = [inviteCode, randomGroup].join("-");
  const seed = Math.floor(Math.random() * charset.length);
  const obfuscatedCode = caesarCipher(fullCode, seed);

  return [id, obfuscatedCode].join("-");
}

function generateRandomString(length) {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return result;
}

function caesarCipher(str, seed) {
  return str
    .split("")
    .map((char) => {
      if (char === "-") return "-";
      const upperChar = char.toUpperCase();
      const index = charset.indexOf(upperChar);
      if (index === -1) return char;

      const newIndex = (index + seed) % charset.length;
      return charset.charAt(newIndex);
    })
    .join("");
}

function deobfuscateCode(obfuscatedCode, seed) {
  return obfuscatedCode
    .split("")
    .map((char) => {
      if (char === "-") return "-";
      const upperChar = char.toUpperCase();
      const index = charset.indexOf(upperChar);
      if (index === -1) return char;

      let newIndex = (index - seed) % charset.length;
      if (newIndex < 0) newIndex += charset.length;
      return charset.charAt(newIndex);
    })
    .join("");
}

module.exports = generateInviteCode;
