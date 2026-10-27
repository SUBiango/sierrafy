# sierrafy-face-engine

Standalone FastAPI face-match microservice called by the gateway over localhost.
Processing is memory-only: no biometric data is ever written to disk.

The embedding model is selected by `FACE_MODEL` and defaults to SFace
(`face_recognition_sface`, OpenCV Zoo), whose ONNX weights are licensed
Apache 2.0 and therefore usable commercially. InsightFace `buffalo_l` is
selectable for benchmarking but is never the default: its code is MIT while its
weights are licensed for non-commercial research only. Architecture
specification §4.3.2 lists the permitted models and the licence of each
model's **weights**, which is the licence that governs use.

**Status:** Week 0 scaffold, placeholder only. Built in Weeks 7–8 (M4).
