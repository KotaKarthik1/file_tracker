# glue-script.py
import sys
import json
import os
from awsglue import utils
args = utils.getResolvedOptions(
    sys.argv,
    [
        "n"
    ]
)
n = args["n"]

def main():
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
