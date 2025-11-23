# glue-script.py
import sys
import json
import os


def main():
    # Read input from Glue job arguments
    n = os.environ.get('n', None)
    try:
        n = int(n)
    except (TypeError, ValueError):
        n = None

    trigger_lambda = False
    if n is not None:
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
