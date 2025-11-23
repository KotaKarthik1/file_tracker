# glue-script.py
import sys
import json

def main():
    # Read input from arguments (simulate SFN payload)
    if len(sys.argv) > 1:
        try:
            event = json.loads(sys.argv[1])
            n = event.get('n', None)
        except Exception:
            n = None
    else:
        n = None

    trigger_lambda = False
    if n is not None and isinstance(n, int):
        if n % 2 == 0:
            trigger_lambda = True
            print(f"n={n} is even. Triggering Lambda: {trigger_lambda}")
        else:
            print(f"n={n} is odd. Not triggering Lambda.")
    else:
        print("No valid 'n' provided. Not triggering Lambda.")

    # Output result for SFN (simulate)
    print(json.dumps({"triggerLambda": trigger_lambda}))

if __name__ == "__main__":
    main()
