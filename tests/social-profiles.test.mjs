import test from "node:test";
import assert from "node:assert/strict";
import { normalizeSocialProfile, socialUsername } from "../lib/social-profiles.ts";
test("usernames, handles and existing profile links use the selected platform", () => {
 assert.equal(normalizeSocialProfile("instagram", "@example.name"), "https://www.instagram.com/example.name");
 assert.equal(normalizeSocialProfile("x", "https://twitter.com/example"), "https://x.com/example");
 assert.equal(normalizeSocialProfile("youtube", "example"), "https://www.youtube.com/@example");
 assert.equal(normalizeSocialProfile("youtube", "https://youtube.com/channel/UC123"), "https://www.youtube.com/channel/UC123");
 assert.equal(socialUsername("onlyfans", "https://onlyfans.com/example"), "example");
 assert.equal(normalizeSocialProfile("x", ""), null);
});
test("wrong hosts and executable links are rejected", () => {
 for (const value of ["https://instagram.com.evil.test/user", "https://user:pass@instagram.com/user", "javascript:alert(1)", "https://example.com/name", "https://instagram.com/user/post", "bad user"]) assert.throws(() => normalizeSocialProfile("instagram", value));
});
