from __future__ import print_function

import boto3
from decimal import Decimal
import json
import urllib
import os
import base64

print('Loading function')

rekognition = boto3.client('rekognition')


# --------------- Helper Functions to call Rekognition APIs ------------------


def detect_faces(image):
    response = rekognition.detect_faces(Image={"Bytes": image})
    return response


def index_faces(image, maxFaces):
    # Note: Collection has to be created upfront. Use CreateCollection API to create a collecion.
    # rekognition.create_collection(CollectionId='BLUEPRINT_COLLECTION')
    response = rekognition.index_faces(Image={"Bytes": image}, CollectionId=os.environ["rekognitionCollection"],
                                       MaxFaces=maxFaces)
    return response


# --------------- Main handler ------------------

def lambda_handler(event, context):
    response = {}
    body = {}

    # Get the object from the event
    eventBody = json.loads(event["body"])
    image = eventBody["image"]
    image = base64.b64decode(image)

    try:

        # Calls rekognition IndexFaces API to detect a single face into specified collection
        indexResponse = index_faces(image, maxFaces=1)

        if (len(indexResponse["FaceRecords"]) > 0):
            boundingBox = indexResponse["FaceRecords"][0]["Face"]["BoundingBox"]
            faceId = indexResponse["FaceRecords"][0]["Face"]["FaceId"]
            imageId = indexResponse["FaceRecords"][0]["Face"]["ImageId"]
            body["faceId"] = faceId
            response["statusCode"] = 200
        else:
            body["faceId"] = 0
            response["statusCode"] = 200

        response["headers"] = {"Access-Control-Allow-Origin": "*"}
        response["body"] = json.dumps(body)
        # response["body"] = body
        response["isBase64Encoded"] = False

        print(response)
        return response

    except Exception as e:
        print("{} \n {}".format(e, body))
        raise e