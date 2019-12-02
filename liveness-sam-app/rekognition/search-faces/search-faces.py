from __future__ import print_function

import boto3
from decimal import Decimal
import json
import urllib
import os
import base64

print("Loading function")

rekognition = boto3.client('rekognition')


# --------------- Helper Functions to call Rekognition APIs ------------------


def number_faces(image):
    response = rekognition.detect_faces(Image={"Bytes": image})
    
    return len(response["FaceDetails"])

def search_faces(image, threshold, maxFaces):
    response = rekognition.search_faces_by_image(CollectionId=os.environ["rekognitionCollection"],
                                Image={"Bytes": image},
                                FaceMatchThreshold=threshold,
                                MaxFaces=maxFaces)
                                
    return response
    
# --------------- Main handler ------------------


def lambda_handler(event, context):

    response = {}
    body = {}
    print(event["body"])
    # Get the object from the event
    eventBody = json.loads(event["body"])
    print(eventBody)
    image = eventBody["image"]
    image = base64.b64decode(image)
    
    try:
        
        if(number_faces(image) > 0):
            # Calls rekognition IndexFaces API to detect a single face into specified collection
            faceResponse = search_faces(image, threshold=50, maxFaces=1)
            searchedBoundingBox = faceResponse["SearchedFaceBoundingBox"]
            if (len(faceResponse["FaceMatches"]) > 0):
                faceId = faceResponse["FaceMatches"][0]["Face"]['FaceId']
                similarity = faceResponse["FaceMatches"][0]["Similarity"]
                # Print response to console.
                body["faceId"] = faceId
                body["boundingBox"] = searchedBoundingBox
                body["similarity"] = similarity
            else:
                body["faceId"] = "0"
                body["boundingBox"] = searchedBoundingBox
                body["similarity"] = 0

        else:
            body["faceId"] = "-1"
            body["boundingBox"] = {}
            body["similarity"] = 0
            

        response["headers"] = {"Access-Control-Allow-Origin" : "*"}
        response["body"] = json.dumps(body)
        response["isBase64Encoded"] = False
        response["statusCode"] = 200
        
        print(response)
        
        return response
        
    except Exception as e:
        print(e)
        raise e
