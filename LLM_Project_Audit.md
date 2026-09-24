# Local Voice Agent Audit

Date: 24 September 2026  
Prepared for: Taha Mazhar  
Project reviewed: `D:/Bali Tech/LLM`  
Scope: read only source review plus isolated logic checks. No product code was changed.

## 1. Decision

The project is a local voice agent prototype built around existing pretrained models. It is not a newly trained LLM and it does not contain a fine tuning pipeline. The direction is suitable for removing ElevenLabs from speech recognition and generation. The current implementation is not ready for unattended customer calls or concurrent callers.

Keep the core STT plus LLM plus TTS approach. First fix session isolation and call decisions and media concurrency. A larger model will not fix those defects. Delay fine tuning until a measured baseline and reliable call controller exist.

The strongest positive is that the project already combines local speech recognition with streamed text generation and local speech synthesis. The largest gaps are real telephony actions and reliable state handling. Its success messages currently overstate what the code actually does.

## 2. What was reviewed and what was not verified

Reviewed all four top level Python files and all three batch launchers plus the Modelfile. Inspected model asset names and installed package metadata and selected historical log entries. Model binaries and third party package internals were not audited. Private key contents and credential values were not reproduced.

There is no top level README or roadmap document or dependency manifest or lock file or Git directory in the inspected folder. The roadmap below is therefore a proposal derived from implementation rather than an assessment of an existing written roadmap.

All four Python files parsed successfully. Seven targeted checks executed the actual normalization and status functions extracted through Python AST without importing the voice application. Six exposed defects and one passed as a control. These checks deliberately target edge cases and are not an estimate of overall model accuracy. Reproducible outputs and source hashes are in `audit-check-results.json` beside this report. The harness is at `D:/Bali Tech/AI Voice agent jamil/tmp/llm_audit_checks.py`.

The project virtual environment failed to launch with a uv trampoline permission error. Windows hardware queries also returned access denied. No full model inference benchmark or microphone test or public tunnel or outbound call was run during this audit. These access errors do not prove the application fails when launched normally by its owner. Actual CPU and RAM and GPU capacity remain unverified. Existing logs are historical evidence rather than fresh benchmarks.

## 3. Current implementation inventory

| Component | Observed implementation | Assessment |
|---|---|---|
| Speech recognition | Faster Whisper with `base.en` using CPU int8 and beam size 1 | Sensible lightweight baseline. Telephone accuracy needs a dedicated test set |
| Language model | Ollama HTTP chat with default `llama3.2:3b` | Useful local baseline. No deterministic qualification guard |
| Custom Modelfile | Based on `llama3.2:1b` with prompt and parameters | Configuration rather than training. Not the default model selected by launchers |
| Speech generation | Piper `en_US-lessac-medium` | Suitable low resource baseline. Per clause synthesis with queueing |
| Desktop audio | Sounddevice at 16 kHz input with RMS thresholds | Functional prototype design with interruption cleanup risks |
| Browser | FastAPI WebSocket plus PCM from Web Audio | Demo interface rather than PSTN or VICIdial integration |
| Real phone transport | Twilio bidirectional Media Streams through localhost.run | Still depends on an external phone API and carrier |
| Storage | Shared plain text `chat_log.txt` | No durable call records or structured disposition delivery |
| Transfer | Chime plus console text or browser event | Simulated. No specialist bridge is implemented |
| Testing | Six sequential build checks | Happy path biased and partly environment dependent |

Observed package metadata includes Python 3.11 in `pyvenv.cfg` and Faster Whisper 1.2.1 and CTranslate2 4.8.2 and Piper TTS 1.8.0 and ONNX Runtime 1.30.0. These are installed distribution labels rather than verified working runtime compatibility.

Model manifests exist for Llama 3.2 1B and 3B and Qwen 2.5 1.5B and `balitech-voice`. Presence on disk does not prove which model is loaded in Ollama. Kokoro assets and package metadata exist but the active code imports Piper. Kokoro filenames include a v0_19 model and a v1.0 voice file. Compatibility must be checked before enabling that alternative.

## 4. Current pipeline

```text
Desktop microphone
  -> RMS voice detection
  -> completed utterance
  -> Faster Whisper
  -> transcript rewriting
  -> Ollama streaming chat
  -> text clause queue
  -> Piper audio queue
  -> Sounddevice playback
  -> text based status heuristic and shared log

Browser microphone
  -> 2048 sample PCM chunks over WebSocket
  -> server RMS endpoint detector
  -> Whisper in executor
  -> blocking Ollama iterator inside connection handler
  -> Piper in executor
  -> WAV messages and browser playback queue

Twilio phone call
  -> public SSH tunnel
  -> 8 kHz mu law WebSocket frames
  -> resampling to 16 kHz
  -> RMS endpoint detector
  -> Whisper
  -> blocking Ollama iterator
  -> Piper and 8 kHz mu law output
```

The browser and phone receive loops also own turn generation. They stop consuming new caller messages while a response is being produced. This is the central reason the claimed full duplex interruption behavior is not implemented reliably on those paths.

## 5. Findings ordered by impact

P1 means fix before external or unattended use. P2 means fix before reliable pilot measurements or expansion. Findings marked reproduced were executed in isolation. Findings marked source confirmed follow directly from source inspection. Runtime risks are stated separately.

### F01 P1 Shared caller memory

Source confirmed. `web_phone_server.py:74` and `twilio_phone_agent.py:100` create one global `VoiceAgent`. Connection handlers use its `messages` list and never reset it when a new call starts. Even sequential callers inherit previous conversation context. Concurrent requests also mutate the same history. This can leak prior caller facts and produce wrong qualification answers.

Fix: share immutable model services if safe but create a separate session object for each call. Store history and qualification fields and cancellation tokens per session. Temporarily enforce one active call until isolation is tested. Resetting a shared agent is not a concurrency fix.

### F02 P1 Transfer is a simulation

Source confirmed. `voice_agent.py:802` plays a chime and prints success. `web_phone_server.py:904` sends a chime and transfer UI event. `twilio_phone_agent.py:242` sends a chime and exits the handler. There is no AMI redirect or SIP transfer or Twilio specialist Dial operation. The browser text at line 660 claims that the call transferred even though no bridge exists.

Fix: label this as qualification completed until a telephony adapter exists. Implement requested and accepted and human connected and failed as separate states. Require actual telephony confirmation before a success announcement. Disconnecting an AI stream is not a transfer.

### F03 P1 Qualification is inferred from generated wording

Reproduced. `voice_agent.py:206` classifies any reply containing `connect you with a` and `specialist` as qualified. The input `I cannot connect you with a specialist.` returned `QUALIFIED_TRANSFER`.

There is no independent stored age and coverage decision. Prompt injection or an ordinary LLM error can therefore affect the call outcome. A prompt is not an enforcement boundary.

Fix: extract structured caller facts and validate them against deterministic campaign rules. Keep uncertainty as unknown. Only the controller may authorize transfer. Require the campaign's explicit permission step and confirmed facts. Never let an LLM sentence directly trigger a phone action.

### F04 P1 Stop and DNC handling is incomplete

Reproduced. The prompt's own stop response `Understood. Goodbye.` returns `IN_PROGRESS`. Other goodbyes return the combined `DISQUALIFIED_OR_DNC` state. DNC and not qualified are different outcomes. No durable suppression store exists.

Fix: model stop and opt out as explicit events. End the conversation appropriately and persist suppression through the dialer's supported integration. Keep unavailable and not interested and unqualified and DNC distinct. Test all entry points rather than only the desktop loop.

### F05 P1 Browser and phone interruption cannot promptly reach generation

Source confirmed. `web_phone_server.py:802` receives messages but lines 867 onward run the response before another receive. Twilio has the same pattern at lines 164 and 226. Blocking `requests` iteration also occupies the event loop while waiting for Ollama tokens. Moving only STT and TTS into an executor does not fix this.

The browser can stop its local speaker but the server can continue producing old audio. Twilio cannot process new caller frames and send `clear` promptly while that same handler is generating or sending the prior response.

Fix: run a dedicated receive task plus a bounded turn worker plus a send task. Use cancellable asynchronous model requests or a worker bridge. Add a turn generation ID to every audio chunk. Discard late output from cancelled turns on both ends. Use Twilio clear and mark acknowledgement according to the [official message protocol](https://www.twilio.com/docs/voice/media-streams/websocket-messages).

### F06 P1 Public phone endpoint accepts unauthenticated streams

Source confirmed. Both WebSocket routes call `accept()` without application authentication. The Twilio path is deliberately published through a tunnel. No Twilio signature validator appears in the application. Anyone able to reach the endpoint could attempt to consume inference resources or inject messages. Exploitability was not tested.

Fix: validate the provider signature before accepting the phone WebSocket. Use session authorization and origin restrictions for browser access. Bound message size and utterance duration and active sessions and queue length. Twilio explicitly requires signature validation in its [Media Streams documentation](https://www.twilio.com/docs/voice/media-streams).

### F07 P1 Credential stored in source

Source confirmed. `twilio_phone_agent.py:39` and line 40 contain nonempty account identifier and auth token string literals. Their validity was not checked and values are omitted from this report. A local TLS private key also sits beside source files. No Git history was available to assess prior exposure.

Fix: move secrets into protected runtime configuration. Rotate the token if this folder or token was shared or committed. Add ignore rules and secret scanning before putting the project in version control. Keep logs and recordings and private keys out of ordinary source distribution.

### F08 P2 Browser endpoint timing uses the wrong frame duration

Reproduced by source arithmetic. The browser sends 2048 samples at requested 16000 Hz. Each chunk represents 128 ms. The server counts each message as if it were a 30 ms frame. Its 21 silence chunks therefore represent 2688 ms rather than the documented 650 ms.

The minimum speech check also uses total buffered frames including silence. Consequently it is not measuring actual speech duration. Twilio counts silence frames toward the minimum as well.

Fix: derive timing from sample counts and the negotiated rate. Track voiced duration separately from buffered duration. Reframe transport audio into fixed detector windows. Verify actual browser sample rate rather than assuming requested constraints were honored.

### F09 P2 Transcript rewriting changes the caller's meaning

Reproduced at `voice_agent.py:116`. Short replacements occur before compound phrases. `seventy two` becomes `70 two` and `eighty five` becomes `80 five`. `I am at a party` becomes `I am at a Part B` because the substitution is global.

Fix: retain the raw transcript. Parse ages only when collecting age. Use longest matching phrases first and reject ambiguity. Remove unconditional mappings such as `up to a two` to 72. Ask for confirmation where audio is uncertain instead of inventing eligibility facts.

### F10 P2 Valid short speech is discarded

Source confirmed. `WHISPER_HALLUCINATIONS` contains `bye` and `thank you`. `transcribe_audio` drops these regardless of acoustic evidence. The desktop loop later checks for `bye` but this transcript has already been discarded.

Fix: combine VAD and speech confidence with state aware interpretation. A real goodbye must not be treated as silence merely because Whisper sometimes hallucinates that phrase.

### F11 P2 Latency metrics are not end to end

Source confirmed. Twilio `log_turn` at line 240 uses a constant 500 ms. Browser timing starts after STT and its final log uses the latest chunk's timestamp rather than the first chunk. Desktop timing begins with text input and excludes endpointing and STT. Even no playback tests record a headset audio start label.

There are 170 historical TTFA entries. Their median is 1159 ms and maximum 12063 ms. These values mix measurement paths and cannot establish production latency or provider comparisons.

Fix: record speech end then endpoint decision then STT completion then first token then first synthesized audio then first sent audio then client playback acknowledgement. Publish p50 and p95 per transport under a stated model and concurrency. Treat playback confirmation separately from server send timing.

### F12 P2 Prompt and generation budget conflict

Source confirmed. The system asks for under 12 words but prescribed opener and transfer replies are longer. `num_predict=24` can truncate required scripts. `num_ctx=1024` is tight and dropping history to the last eight messages removes age or consent after enough exchanges.

Fix: use deterministic approved phrases for core gates. Persist verified fields separately from the rolling transcript. Tune context and output budgets using actual token counts. Handle corrections such as a changed age explicitly. A larger context alone does not replace durable state.

### F13 P2 Lifecycle and resource bounds are missing

Source confirmed. Recording buffers can grow while speech or noise continues. Calls have no enforced total duration or idle timeout on server transports. Desktop queues are unbounded. Interruption cleanup can drain the sentinel just inserted and joins have partial timeouts. A worker may outlive the turn and share resettable events with the next turn. This thread race is a source identified risk rather than a reproduced hang.

Fix: session scoped cancellation with bounded queues and deadlines and deterministic task cleanup. Close streaming HTTP responses in a context manager. Cancel child work when a socket disconnects. Use `finally` cleanup and explicit WebSocket close behavior. Add maximum utterance duration and overload refusal.

### F14 P2 Browser playback can revive cancelled audio

Source confirmed risk. Audio decode is asynchronous and messages contain no turn IDs. A decode may finish after interruption and enqueue stale audio. The `onended` callback also advances the shared queue. `isMuted` is set on transfer but not reset by `startCall` or `endCall` so the next browser call can remain muted.

Fix: increment playback generation on interrupt and disconnect. Validate that generation after decoding. Reset all session flags on each new call. Wait for real playback completion before closing rather than a fixed 2500 ms delay.

### F15 P2 Audio conversion and phone playback assumptions

Source confirmed. Twilio resampling passes `None` as filter state on every input packet. It assumes Piper is always 22050 Hz and assumes every inbound media payload is 20 ms. Packet boundaries can cause resampling discontinuities or sample count drift. Outgoing sleeps are 18 ms for 20 ms audio which can build provider buffering. No mark tracking confirms completion before the handler exits.

Fix: negotiate and validate media format. Preserve resampler state per call and use the actual TTS output rate. Derive input duration from payload size. Keep playback completion separate from bytes sent. Python `audioop` is present on the configured 3.11 baseline but removed in Python 3.13 according to [Python documentation](https://docs.python.org/3/library/audioop.html). Pin the working interpreter until codec migration is tested.

### F16 P2 Readiness and deployment cannot be reproduced cleanly

Source confirmed. The dial worker waits 4.5 seconds instead of waiting for model readiness. SSH `readline()` can block beyond its surrounding nominal 18 second timeout. Paths are tied to one Windows machine. Initializing a web service also calibrates the server's physical microphone even though audio comes from remote callers.

Fix: separate device setup from model service startup. Add readiness checks and a bounded tunnel startup path. Pin Python and dependency versions and model revisions. Document installation and recovery. Use a stable authenticated deployment rather than a development tunnel for production.

### F17 P2 Test suite does not support its deployment claim

Source confirmed. `build_pass_test.py` exercises one happy path using text and no STT. The bleed check uses a constant synthetic frame and does not simulate real acoustic feedback. The section says subsecond but permits an average below 2 seconds and individual turns up to 2.6 seconds. Final output declares 100 percent compliance and deployment readiness without evidence for either.

Fix: replace that conclusion with precisely named checks. Add negative gate cases and DNC and noisy audio and two sessions and interruption and provider failure tests. Separate deterministic unit checks from device dependent benchmarks. Include original age normalization phrases rather than just `seventy`.

### F18 P2 Reporting and recovery have no durable foundation

Source confirmed. A shared transcript file has no call IDs or session keys or structured event history. Exceptions while logging are ignored. There are no implemented dispositions or retries or callback records or suppression delivery records. This would recreate the missing outcome reporting problem found in the previous ElevenLabs project.

Fix: start with durable sessions and turns and decisions and transfer attempts and outcome delivery records. Use stable call correlation IDs. Keep audio storage optional but record source and timestamps. Configure access and retention for caller information. Full raw transcripts should not be necessary for operational metrics.

## 6. Historical evidence of incorrect decisions

The existing `chat_log.txt` includes a caller stating age 72 followed by no coverage and no disability. The response then says the caller does not meet the age requirement at line 863. Another exchange at line 873 asserts age 65 after the caller only says Okay. These are historical text records rather than independently verified recordings. They reinforce the need for a deterministic qualification controller and unknown states.

## 7. Tools and models: retain versus evaluate

The following are benchmark candidates and engineering recommendations. They are not claimed to outperform the current stack on this machine. Official sources were checked on the audit date. This is a shortlist suited to the project rather than a claim to cover every available model.

| Layer | Current decision | Candidate and benefit | Tradeoff and test |
|---|---|---|---|
| VAD | Replace energy only decisions | Silero VAD with a pre speech buffer and sample based endpointing | More integration work. Test quiet voices and noise and echo before setting thresholds |
| STT | Keep Faster Whisper | Compare `base.en` with `small.en` on telephone audio. Consider `distil-large-v3` when GPU capacity is verified | Larger variants require more compute. Measure age and negation accuracy rather than only average word error |
| LLM | Keep Llama 3.2 3B as baseline | Evaluate Qwen3 4B Instruct 2507 with validated structured extraction | Additional memory and potentially latency. Model output still needs deterministic validation |
| TTS | Keep Piper as baseline | A B test Kokoro 82M using compatible model and voice assets | Naturalness is subjective and phone bandwidth limits gains. Measure first audio latency and pronunciation |
| Serving | Keep Ollama for a single user prototype | Evaluate vLLM only when a GPU based multi call requirement is measured | More deployment complexity. Changing serving software is premature before session isolation |
| Orchestration | Refactor current code | Async receive and turn and send tasks plus bounded workers | Requires careful cancellation tests but directly resolves the current bottleneck |
| Telephony | Build an adapter boundary | Reuse tested Asterisk AudioSocket and AMI patterns from the Medicare project when targeting VICIdial | Requires call IDs and codec tests and real transfer confirmation and disposition delivery |

Source basis: [Faster Whisper](https://github.com/SYSTRAN/faster-whisper) documents CPU and GPU execution and Distil Whisper support. [Silero VAD](https://github.com/snakers4/silero-vad) provides local voice activity detection. [Qwen model card](https://huggingface.co/Qwen/Qwen3-4B-Instruct-2507) describes the non thinking instruction model. [Ollama structured outputs](https://docs.ollama.com/capabilities/structured-outputs) supports schema constrained responses. [Kokoro model card](https://huggingface.co/hexgrad/Kokoro-82M) identifies its 82 million parameter TTS model. [Piper upstream](https://github.com/OHF-Voice/piper1-gpl) is the current local TTS engine project. Review engine and individual voice licenses before packaging. [vLLM documentation](https://docs.vllm.ai/en/latest/) describes a serving alternative for later evaluation.

## 8. What ElevenLabs independence actually means

The inspected code does not call ElevenLabs. Local Whisper and Ollama and Piper provide its AI path. That is meaningful progress toward a self hosted voice stack.

It is still not completely independent of external services in every mode. Twilio carries real telephone calls and localhost.run exposes the development endpoint. Browser UI loads Google Fonts. First model downloads require access to model distribution services. Local AI inference does not make phone transport free or make every call fully private.

Jamil's project contains Asterisk media and transfer infrastructure and a backend qualification engine. This folder replaces model services but does not yet reproduce those call control capabilities. Reuse the useful integration boundaries and correct their known disposition gaps rather than copying the previous system unchanged.

No training scripts or dataset pipeline or adapter checkpoints were found. The Modelfile changes prompt and parameters. That is model configuration rather than fine tuning. A new foundation model trained from zero is not justified by the problems found here.

## 9. Proposed pipeline after the audit

```text
Authenticated browser or Asterisk transport
  -> per call session and stable dialer IDs
  -> streaming audio receiver with bounded buffer
  -> stateful resampling and VAD
  -> STT with original transcript retained
  -> structured intent and fact extraction
  -> deterministic campaign state machine
  -> approved response or constrained LLM response
  -> TTS chunks carrying turn IDs
  -> cancellable playback with acknowledgement
  -> real transfer or hangup controller
  -> persistent outcome and reliable dialer write back
```

LLM output should express candidate facts and intent rather than directly control calls. Suggested fields are age and coverage and disability and stop intent with unknown allowed. The controller owns consent and qualification and action approval. An interruption cancels one generation and does not reset the caller's verified facts.

## 10. Roadmap with exit criteria

| Phase | Work | Exit criteria |
|---|---|---|
| 0 Reproducible baseline | Dependency manifest and model configuration and secret separation and runnable test harness | Fresh setup starts with no source credential edits. No false deployment claims |
| 1 Correct decisions | Session isolation and state machine and normalization fixes and DNC separation | All required negative cases pass. Two callers cannot share facts |
| 2 Reliable media | Concurrent receiver and sender and cancellation and sample timing and resource limits | Speaking during generation cancels stale audio. Endpoints match measured audio duration |
| 3 Actual telephony | One Asterisk adapter or a completed Twilio adapter with real actions and outcome delivery | Human connection is confirmed independently. Failed transfer stays failed. Each test call has a final correlated record |
| 4 Model comparison | Llama versus Qwen and Whisper variants and Piper versus Kokoro | Same held out telephone dataset and same hardware and end to end timing for every candidate |
| 5 Controlled pilot | Load tests and failure recovery and observability and deployment procedure | Agreed p95 targets hold at tested concurrency. No session leakage or stale audio or unreported outcomes |

Do not assign capacity from a model's parameter count. Confirm installed hardware and memory first. Then measure resident model memory plus KV cache plus STT and TTS memory plus concurrency overhead. Training capacity is a separate sizing exercise and is not currently required.

## 11. Minimum acceptance matrix

| Test | Required behavior |
|---|---|
| Caller age 64 with Medicare | No transfer under current age rule |
| Caller age unknown with yes answer | Clarify the relevant field rather than infer an age |
| Caller age 72 without coverage or disability | Disqualify for coverage rules rather than age |
| Caller corrects age | Recompute decision from corrected confirmed facts |
| Stop or remove me at any point | Stop pitch and persist the appropriate suppression outcome |
| Quoted or negated specialist phrase | No transfer without controller authorization |
| Seventy two and eighty five | Correct parsing without corrupting unrelated speech |
| Quiet speech and short yes or no | No dropped valid reply and no hallucinated qualification |
| Two simultaneous or sequential calls | Completely independent state and logs |
| Interrupt during LLM or TTS or playback | Old generation cancelled and caller audio retained |
| Ollama stall or TTS failure | Bounded recovery with explicit failure outcome |
| Specialist busy or unavailable | No success announcement and a recorded failure |
| Duplicate provider event | One effective outcome update |
| Browser reconnect after transfer or mute | Clean new call state with working microphone |

For evaluation data use authorized and redacted calls with manual labels plus carefully reviewed synthetic edge cases. Split by caller or call before generating variations. Keep test data out of training. Measure exact qualification decisions and stop handling in addition to transcription and conversational quality.

## 12. Immediate recommendation

Keep Faster Whisper plus Ollama plus Piper for the next repair cycle. Fix F01 through F09 before spending effort on a larger LLM or fine tuning. After that measure a small controlled call set end to end and use those results to choose model upgrades. The current project provides a useful local inference foundation but call correctness and lifecycle control must catch up before it replaces the existing campaign system.
