import test from "node:test";
import assert from "node:assert/strict";
import { activityStatsOptions } from "../lib/activity-stats-options.ts";
test("activity filters have bounded periods, roles and pagination",()=>{
 assert.equal(activityStatsOptions(new URLSearchParams()).days,30);
 const options=activityStatsOptions(new URLSearchParams("days=90&role=model&hour=23&weekday=6&page=2&online=1"));
 assert.equal(options.role,"model");assert.equal(options.hour,23);assert.equal(options.weekday,6);assert.equal(options.page,2);assert.equal(options.online,true);
 assert.equal(activityStatsOptions(new URLSearchParams("days=999999&role=admin&page=-1")).days,30);
 assert.equal(activityStatsOptions(new URLSearchParams("page=999999999")).page,100000);
});
test("invalid calendar dates and out-of-range hourly selections are rejected",()=>{
 for(const text of ["date=2026-02-30","date=bad","hour=24","hour=-1","weekday=7"])assert.throws(()=>activityStatsOptions(new URLSearchParams(text)));
 assert.equal(activityStatsOptions(new URLSearchParams("date=2024-02-29")).day,"2024-02-29");
});
