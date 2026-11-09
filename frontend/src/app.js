import { auth, db } from "./firebase-config.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const $ = s => document.querySelector(s);

let session = localStorage.getItem("apex_session") || "";
let currentUser = null;

if (session && $("#sid")) {
  $("#sid").textContent = session.slice(0, 8);
}

// Firebase Login Interface
const authPanel = document.createElement("section");

authPanel.className = "panel";
authPanel.innerHTML = `
  <div class="panelhead">
    <h2>APEX Account</h2>
    <span id="authStatus">Not logged in</span>
  </div>

  <input id="authEmail" type="email"
    placeholder="Email address"
    style="width:100%;padding:12px;margin:8px 0">

  <input id="authPassword" type="password"
    placeholder="Password"
    style="width:100%;padding:12px;margin:8px 0">

  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
    <button id="loginBtn">Login</button>
    <button id="signupBtn">Sign Up</button>
    <button id="googleBtn">Google Login</button>
    <button id="appleBtn">Apple Login</button>
    <button id="logoutBtn" class="quiet">Logout</button>
  </div>

  <p id="authMessage" class="hint"></p>
`;

$("main").prepend(authPanel);

function authMessage(message) {
  $("#authMessage").textContent = message;
}

async function saveUserProfile(user) {
  await setDoc(doc(db, "users", user.uid), {
    uid: user.uid,
    email: user.email || "",
    displayName: user.displayName || "",
    provider: user.providerData[0]?.providerId || "unknown",
    lastLogin: serverTimestamp()
  }, { merge: true });
}

async function loginEmail() {
  const email = $("#authEmail").value.trim();
  const password = $("#authPassword").value;

  if (!email || !password) {
    authMessage("Enter email and password.");
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email, password);
    authMessage("Login successful!");
  } catch (error) {
    authMessage(error.message);
  }
}

async function signupEmail() {
  const email = $("#authEmail").value.trim();
  const password = $("#authPassword").value;

  if (!email || !password) {
    authMessage("Enter email and password.");
    return;
  }

  if (password.length < 6) {
    authMessage("Password must be at least 6 characters.");
    return;
  }

  try {
    await createUserWithEmailAndPassword(auth, email, password);
    authMessage("Account created successfully!");
  } catch (error) {
    authMessage(error.message);
  }
}

async function loginGoogle() {
  try {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
    authMessage("Google Login successful!");
  } catch (error) {
    authMessage(error.message);
  }
}

async function loginApple() {
  try {
    const provider = new OAuthProvider("apple.com");
    await signInWithPopup(auth, provider);
    authMessage("Apple Login successful!");
  } catch (error) {
    authMessage(error.message);
  }
}

async function logout() {
  try {
    await signOut(auth);
    authMessage("Logged out successfully.");
  } catch (error) {
    authMessage(error.message);
  }
}

$("#loginBtn").onclick = loginEmail;
$("#signupBtn").onclick = signupEmail;
$("#googleBtn").onclick = loginGoogle;
$("#appleBtn").onclick = loginApple;
$("#logoutBtn").onclick = logout;

onAuthStateChanged(auth, async user => {
  currentUser = user;

  if (user) {
    $("#authStatus").textContent = "● Logged in";
    authMessage("Welcome " + (user.email || user.displayName || ""));

    try {
      await saveUserProfile(user);
    } catch (error) {
      authMessage("Profile save error: " + error.message);
    }
  } else {
    $("#authStatus").textContent = "Not logged in";
  }
});

// APEX Agent Functions

function bubble(text, who) {
  let d = document.createElement("div");
  d.className = "bubble " + who;
  d.textContent = text;
  $("#chat").append(d);
  $("#chat").scrollTop = $("#chat").scrollHeight;
}

async function api(path, body) {
  let r = await fetch(path, body ? {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  } : {});

  let j = await r.json();

  if (!r.ok) {
    throw Error(j.error || "Request failed");
  }

  return j;
}

async function load() {
  try {
    let h = await api("/api/health");

    $("#status").textContent = "● " + h.project + " online";

    if (session) {
      let old = await api(
        "/api/history?session_id=" + encodeURIComponent(session)
      );

      old.messages.forEach(m => {
        bubble(m.content, m.role === "user" ? "user" : "agent");
      });
    }

    await approvals();
    await files();

  } catch (e) {
    $("#status").textContent = "● Offline";
  }
}

async function approvals() {
  let x = await api("/api/actions/pending");
  let root = $("#approvals");

  root.replaceChildren();

  if (!x.pending.length) {
    root.textContent = "No pending approvals.";
    root.className = "empty";
    return;
  }

  root.className = "";

  x.pending.forEach(a => {
    let d = document.createElement("div");
    d.className = "approval";

    let title = document.createElement("b");
    title.textContent = "#" + a.id + " · " + a.action;

    let p = document.createElement("p");
    p.textContent = a.details;

    let row = document.createElement("div");
    row.className = "actions";

    for (let [label, yes, cl] of [
      ["Approve", true, ""],
      ["Reject", false, "reject"]
    ]) {
      let b = document.createElement("button");

      b.textContent = label;
      b.className = cl;

      b.onclick = async () => {
        b.disabled = true;

        try {
          let z = await api(
            `/api/actions/${a.id}/decide`,
            { approve: yes }
          );

          bubble(JSON.stringify(z), "agent");

          await approvals();
          await files();

        } catch (e) {
          alert(e.message);
        }
      };

      row.append(b);
    }

    d.append(title, p, row);
    root.append(d);
  });
}

async function files() {
  let x = await api("/api/workspace");
  let root = $("#files");

  root.replaceChildren();

  if (!x.files.length) {
    root.textContent = "Workspace is empty.";
    return;
  }

  x.files.forEach(f => {
    let d = document.createElement("div");
    d.className = "file";

    let n = document.createElement("b");
    n.textContent = f.name;

    let t = document.createElement("span");
    t.textContent = f.type;

    d.append(n, t);
    root.append(d);
  });
}

$("#form").onsubmit = async e => {
  e.preventDefault();

  let m = $("#message").value.trim();

  if (!m) return;

  bubble(m, "user");

  $("#message").value = "";
  $("#send").disabled = true;
  $("#send").textContent = "…";

  try {
    let x = await api("/api/chat", {
      message: m,
      session_id: session || null
    });

    session = x.session_id;

    localStorage.setItem("apex_session", session);

    $("#sid").textContent = session.slice(0, 8);

    bubble(x.reply, "agent");

    await approvals();
    await files();

  } catch (err) {
    bubble("Error: " + err.message, "agent");

  } finally {
    $("#send").disabled = false;
    $("#send").textContent = "Send ↗";
  }
};

$("#refresh").onclick = approvals;
$("#filesRefresh").onclick = files;

load();
