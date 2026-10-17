import sys, subprocess, time, numpy as np, torch
from transformers import Wav2Vec2ForCTC, Wav2Vec2Processor
torch.set_num_threads(4)
M='jonatasgrosman/wav2vec2-large-xlsr-53-arabic'
proc = Wav2Vec2Processor.from_pretrained(M)
model = torch.quantization.quantize_dynamic(Wav2Vec2ForCTC.from_pretrained(M).eval(), {torch.nn.Linear}, dtype=torch.qint8)
SR=16000; HOP=320; CH=30*SR; PAD=2*SR
audio_dir, out_dir = sys.argv[1], sys.argv[2]
for j in range(1, 31):
    t0=time.time()
    a = subprocess.run(['ffmpeg','-v','error','-i',f'{audio_dir}/joz{j:02d}.mp3','-ac','1','-ar',str(SR),'-f','f32le','-'],capture_output=True).stdout
    x = np.frombuffer(a, np.float32)
    nfr = len(x)//HOP
    out = []
    for s in range(0, len(x), CH):
        a0 = max(0, s-PAD); a1 = min(len(x), s+CH+PAD)
        seg = x[a0:a1]; seg = (seg-seg.mean())/(seg.std()+1e-7)
        with torch.inference_mode():
            lp = torch.log_softmax(model(torch.from_numpy(seg.copy())[None]).logits[0], -1).numpy()
        f0 = (s-a0)//HOP; f1 = f0 + (min(s+CH, len(x))-s)//HOP
        out.append(lp[f0:min(f1, len(lp))])
    e = np.concatenate(out).astype(np.float16)
    np.save(f'{out_dir}/joz{j:02d}.npy', e)
    ids = e[:750].astype(np.float32).argmax(-1)
    vocab = {v:k for k,v in proc.tokenizer.get_vocab().items()}
    txt=''.join(vocab[i] for k,i in enumerate(ids) if (k==0 or i!=ids[k-1]) and i!=proc.tokenizer.pad_token_id).replace('|',' ')
    print(j, len(x)/SR, nfr, e.shape, round(time.time()-t0), txt, flush=True)
