cd "$(dirname "$0")/../.."
while true; do
  klaar=0
  for id in f14e89ab-6db2-41ea-8bbc-0827d6025470 ca8313fb-3c2e-4b37-9985-0f8be8dc6e8b 467f8307-74dd-4e84-b443-40cc1ce88f9e; do
    s=$(npm run -s live -- GET /api/profiles/$id/status 2>/dev/null | tail -1 | python3 -c "import sys,json; d=json.load(sys.stdin); st={s['job']:s['state'] for s in d['steps']}; print('K' if st.get('profile_synthesis')=='klaar' or (d['pendingJobs']==0 and d['runningJobs']==0) else 'B')" 2>/dev/null)
    [ "$s" = "K" ] && klaar=$((klaar+1))
  done
  echo "klaar: $klaar/3"
  [ $klaar -eq 3 ] && break
  sleep 45
done
