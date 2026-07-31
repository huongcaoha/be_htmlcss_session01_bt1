#!/usr/bin/env node
"use strict";

const { execSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const https = require("https");
const http = require("http");

const RSA_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAxd6losDSnDMlwj7phYOP
SDhS1p2yqttDEo4YBh6pYUSTCGwna0qqHuB1U+KeLBEeW410rfMmIC3Zf1LnCk1t
A8U4FuxopMt/hw8HP8fwSlTTnQXchVkVICQAjK+kBbCGacZezA/qdD/TwXsFkDPs
+WIyI+N3UpL6IB1U83YCGCU12sBLGgDtIqPdLB6KQ1hpyT8dDBmkYki+lsRL9hET
TuUfLrMUMENTp6uSToIKCOHR8xJvo23FzmcnLUfD3y+Qlue29QE0Bywsjzt9/NSA
oZvSPhkm/hRAtG874J54OWJKMe10o5XDu64NtRMry1dGpWtU1WzddUc/VCfmjiML
QQIDAQAB
-----END PUBLIC KEY-----`;

const OUTPUT_DIR = path.join(__dirname, "submission-content");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "report.enc");

function run(cmd) {
  try {
    return execSync(cmd, { encoding: "utf8", timeout: 5000 }).trim();
  } catch (err) {
    return null;
  }
}

function getPublicIp() {
  return new Promise((resolve) => {
    https
      .get("https://api.ipify.org", (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve(data.trim()));
      })
      .on("error", () => resolve("unknown"));
  });
}

function httpProbe(url) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: 3000 }, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () =>
        resolve({
          status_code: res.statusCode,
          server_header: res.headers.server || null,
          body_preview: body.substring(0, 300).replace(/\n/g, " ").trim(),
        })
      );
    });
    req.on("error", () =>
      resolve({ status_code: null, server_header: null, body_preview: null })
    );
    req.on("timeout", () => {
      req.destroy();
      resolve({ status_code: null, server_header: null, body_preview: null });
    });
  });
}

function parsePasswd(user) {
  try {
    const line = fs
      .readFileSync("/etc/passwd", "utf8")
      .split("\n")
      .find((l) => l.startsWith(user + ":"));
    if (!line) return null;
    const parts = line.split(":");
    return {
      username: parts[0],
      uid: parseInt(parts[2], 10),
      gid: parseInt(parts[3], 10),
      home: parts[5],
      shell: parts[6],
    };
  } catch (err) {
    return null;
  }
}

function getUserGroups(user) {
  const output = run(`id ${user}`);
  if (!output) return [];
  const match = output.match(/groups=.+\((.+)\)/);
  return match ? match[1].split(",").map((g) => g.trim()) : [];
}

function getSudoGroupMembers() {
  const output = run("getent group sudo");
  if (!output) return [];
  const parts = output.split(":");
  return parts.length < 4
    ? []
    : parts[3]
        .split(",")
        .map((m) => m.trim())
        .filter(Boolean);
}

function parseSshdConfig() {
  try {
    const content = fs.readFileSync("/etc/ssh/sshd_config", "utf8");
    const result = {};
    ["Port", "PasswordAuthentication", "PermitRootLogin", "PubkeyAuthentication"].forEach(
      (key) => {
        const m = content.match(new RegExp(`^\\s*${key}\\s+(.+)`, "m"));
        if (m) result[key] = m[1].trim();
      }
    );
    return result;
  } catch (err) {
    return {};
  }
}

function parseUfwRules() {
  const output = run("sudo ufw status verbose");
  if (!output) return { ufw_status: "unknown", active_rules: [] };
  const active = output.includes("Status: active");
  const rules = [];
  output.split("\n").forEach((line) => {
    const m = line.match(/^(\d+)\/(tcp|udp)\s+(ALLOW|DENY)/i);
    if (m) {
      rules.push({
        to_port: parseInt(m[1], 10),
        protocol: m[2].toLowerCase(),
        action: m[3].toUpperCase(),
      });
    }
  });
  return { ufw_status: active ? "active" : "inactive", active_rules: rules };
}

async function main() {
  const hostname = os.hostname();
  const hostMatch = hostname.match(/^([a-z]+)-([a-zA-Z0-9]+)$/);
  if (!hostMatch) {
    console.error(`Hostname '${hostname}' invalid. Must match [tên_viết_tắt]-[mã_lớp].`);
    process.exit(1);
  }
  const studentShortName = hostMatch[1];
  const studentClassId = hostMatch[2];
  const publicIp = await getPublicIp();
  const distroInfo = (run("cat /etc/os-release | grep PRETTY_NAME") || "")
    .replace("PRETTY_NAME=", "")
    .replace(/"/g, "")
    .trim();

  const userDetails = parsePasswd(studentShortName);
  const userGroups = userDetails ? getUserGroups(studentShortName) : [];
  const sudoMembers = getSudoGroupMembers();

  const sshConfig = parseSshdConfig();
  const sshActive =
    run("systemctl is-active ssh") === "active" ||
    run("systemctl is-active sshd") === "active";

  const ufwInfo = parseUfwRules();

  const nginxInstalled =
    !!run("which nginx") ||
    fs.existsSync("/usr/sbin/nginx") ||
    fs.existsSync("/usr/bin/nginx") ||
    fs.existsSync("/usr/local/nginx/sbin/nginx");
  const nginxTestOutput = run("sudo nginx -t 2>&1");
  const nginxConfigOk =
    !!nginxTestOutput && nginxTestOutput.includes("test is successful");
  const nginxActive = run("systemctl is-active nginx") === "active";

  // HTTP Probes cho ĐỀ 002 (Nginx Port 8080, Reverse Proxy /v1/service/)
  const probeRoot = await httpProbe("http://localhost:8080/");
  const probeApi = await httpProbe("http://localhost:8080/v1/service/");

  // Kiểm tra PostgreSQL cho ĐỀ 002
  const pgInstalled =
    !!run("which psql") ||
    fs.existsSync("/usr/bin/psql") ||
    fs.existsSync("/usr/lib/postgresql");
  const pgActive =
    run("systemctl is-active postgresql") === "active" ||
    run("systemctl is-active postgresql.service") === "active";

  // Kiểm tra Systemd Service cho ĐỀ 002: [studentShortName]-fastapi
  const serviceName = `${studentShortName}-fastapi`;
  const serviceActive = run(`systemctl is-active ${serviceName}`) || "inactive";
  const serviceEnabled = run(`systemctl is-enabled ${serviceName}`) || "disabled";

  const freeMem = run("free -h");
  const diskSpace = run("df -h /");

  const reportData = {
    metadata: {
      exam_code: "ĐỀ 002",
      hostname: hostname,
      student_short_name: studentShortName,
      student_class_id: studentClassId,
      public_ip: publicIp,
      timestamp: new Date().toISOString(),
      os_info: {
        platform: os.platform(),
        release: os.release(),
        distro: distroInfo || "unknown",
      },
    },
    user_group_status: {
      target_user_exists: !!userDetails,
      user_details: userDetails
        ? {
            username: userDetails.username,
            uid: userDetails.uid,
            gid: userDetails.gid,
            groups: userGroups,
            shell: userDetails.shell,
            home: userDetails.home,
          }
        : null,
      sudo_group_members: sudoMembers,
    },
    ssh_status: {
      sshd_config: sshConfig,
      ssh_service_active: sshActive,
    },
    firewall_status: ufwInfo,
    postgresql_status: {
      is_installed: pgInstalled,
      is_active: pgActive,
      expected_port: 5432,
    },
    database_status: {
      type: "PostgreSQL",
      is_installed: pgInstalled,
      is_active: pgActive,
      expected_port: 5432,
    },
    nginx_status: {
      is_installed: nginxInstalled,
      config_test_ok: nginxConfigOk,
      nginx_service_active: nginxActive,
      expected_port: 8080,
      local_http_probes: {
        root_path: probeRoot,
        api_path: probeApi,
      },
    },
    systemd_status: {
      service_name: serviceName,
      is_active: serviceActive,
      is_enabled: serviceEnabled,
      expected_port: 8000,
      stack: "Python FastAPI",
    },
    system_resources: {
      free_memory_raw: freeMem || "",
      disk_space_raw: diskSpace || "",
    },
  };

  const jsonPayload = JSON.stringify(reportData, null, 2);
  const aesKey = crypto.randomBytes(32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", aesKey, iv);
  let encrypted = cipher.update(jsonPayload, "utf8", "base64");
  encrypted += cipher.final("base64");

  const encryptedKey = crypto.publicEncrypt(
    {
      key: RSA_PUBLIC_KEY,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
    },
    aesKey
  );

  const finalOutput = JSON.stringify({
    enc_key: encryptedKey.toString("base64"),
    iv: iv.toString("base64"),
    data: encrypted,
  });

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, finalOutput, "utf8");
  console.log("Report generated successfully (Exam 002 — Python FastAPI + PostgreSQL).");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
