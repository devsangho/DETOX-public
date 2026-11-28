/* Side-by-side LIBERO replays (left: recorded attacked run, right: same run with the DETOX hold). 20 fps, 50 ms per step. */
window.DETOX_VIDEOS = [
 {
  "slug": "release_object",
  "harm": "Abrupt release",
  "scene": "LIBERO-Object \u00b7 BackdoorVLA trigger",
  "lead_steps": 5,
  "with_hold": "object kept in the gripper",
  "camera": "agentview"
 },
 {
  "slug": "release_spatial",
  "harm": "Abrupt release",
  "scene": "LIBERO-Spatial \u00b7 instruction attack",
  "lead_steps": 11,
  "with_hold": "object kept in the gripper",
  "camera": "top view"
 },
 {
  "slug": "contact",
  "harm": "Forceful contact",
  "scene": "LIBERO-Spatial \u00b7 instruction attack",
  "lead_steps": 25,
  "with_hold": "push stopped",
  "camera": "top view"
 },
 {
  "slug": "overspeed",
  "harm": "Overspeed",
  "scene": "LIBERO-Spatial \u00b7 instruction attack",
  "lead_steps": 25,
  "with_hold": "arm stopped",
  "camera": "top view"
 }
];
