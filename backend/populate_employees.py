import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Employee data from the SQL dump
employees_data = [
    ('61496N', 'ABERKANE', 'AMMAR', 'ORDONNATEUR EN CHEF N2', 'ENP', 'INAS - TOUS LES CHAMPS INAS', 'DIVISION'),
    ('37058Q', 'ABID', 'YAHIA', 'ING  PRODUCTION N2', 'ENP', 'INAS - TOUS LES CHAMPS INAS', 'RESERVOIR'),
    ('34536T', 'ADJEROUD', 'RIDA', 'TECHN WORK OVER PPL', 'ENP', 'INAS - TOUS LES CHAMPS INAS', 'PUITS'),
    ('37048L', 'AFIF', 'ABDERRAHMEN', 'ING RESERVOIR N2', 'ENP', 'INAS - TOUS LES CHAMPS INAS', 'RESERVOIR'),
    ('32753D', 'AICHOUNA', 'CHOAYB', 'TECHN WIRE LINE PPL', 'ENP', 'INAS - TOUS LES CHAMPS INAS', 'PUITS'),
    ('71467M', 'AOUMEUR', 'FATIHA', 'TECHNICIEN PUITS PPL', 'ENP', 'INAS - TOUS LES CHAMPS INAS', 'MESURES & CONTRÔLE'),
    ('37020K', 'ARABA ABDELKADER', 'ABDELKADER', 'SUPERVISEUR OPERATIONS N 2', 'ENP', 'INAS - TOUS LES CHAMPS INAS', 'PUITS'),
    ('91270D', 'BAAZIZ', 'MOURAD', 'C/MAITRE MESURES PPL N2', 'ENP', 'INAS - TOUS LES CHAMPS INAS', 'MESURES & CONTRÔLE'),
    ('37021M', 'BAFFA', 'BOUBAKEUR', 'SUPERVISEUR OPERATIONS N 2', 'ENP', 'INAS - TOUS LES CHAMPS INAS', 'PUITS'),
    ('74953U', 'BELBAKI', 'MOHAMMED TAHAR', 'TECHNICIEN PUITS N2', 'ENP', 'INAS - TOUS LES CHAMPS INAS', 'PUITS'),
    ('92326V', 'BELHADJ', 'LOTFI', 'CHEF DE SERVICE SERVEILLANCE GEOLOGIE', 'ENP', 'INAS - TOUS LES CHAMPS INAS', 'GEOLOGIE'),
    ('56647N', 'BELKADI', 'KADA', 'CHEF DIVISION ENP', 'ENP', 'INAS - TOUS LES CHAMPS INAS', 'DIVISION'),
    ('32756K', 'BENAZIZA', 'WAHID', 'TECHN PREPARATION PPL', 'ENP', 'INAS - TOUS LES CHAMPS INAS', 'TECHNIQUES PUITS'),
    ('32755H', 'BENCHOHRA', 'MILOUD', 'TECHN PREPARATION PPL', 'ENP', 'INAS - TOUS LES CHAMPS INAS', 'PUITS'),
    ('37023R', 'BENTAHAR', 'HABIB', 'ING RESERVOIR N2', 'ENP', 'INAS - TOUS LES CHAMPS INAS', 'RESERVOIR'),
    ('37006P', 'BENYAHIA', 'DJALAL', 'ING GEOPHYSIQUE N2', 'ENP', 'INAS - TOUS LES CHAMPS INAS', 'TECHNIQUES PUITS'),
    ('34544T', 'BERGOUG', 'TAREK', 'TECHNICIEN GEOLOGUE N5', 'ENP', 'INAS - TOUS LES CHAMPS INAS', 'GEOLOGIE'),
    ('34537V', 'BOUANANI', 'MUSTAPHA', 'ING GEOPHYSIQUE N2', 'ENP', 'INAS - TOUS LES CHAMPS INAS', 'TECHNIQUES PUITS'),
    ('08785V', 'BOUNOUA', 'LOUNES', 'C/MAITRE MESURES PPL', 'ENP', 'INAS - TOUS LES CHAMPS INAS', 'MESURES & CONTRÔLE'),
    ('32762F', 'BOUDJEMAA', 'ABDELGHANI MANSOUR', 'C/MAITRE WIRE LINE N2', 'ENP', 'INAS - TOUS LES CHAMPS INAS', 'PUITS'),
    ('68555Y', 'BOUDOUH ALI', 'ALI', 'C/MAITRE PREPARATION N2', 'ENP', 'INAS - TOUS LES CHAMPS INAS', 'PUITS'),
    ('07004F', 'BOUHAFS', 'HABIBA', 'C/MAITRE MESURES N2', 'ENP', 'INAS - TOUS LES CHAMPS INAS', 'MESURES & CONTRÔLE'),
    ('37041V', 'BOUKENDI', 'RECHDI', 'ING GEOLOGUE N2', 'ENP', 'INAS - TOUS LES CHAMPS INAS', 'GEOLOGIE'),
    ('15182U', 'BOULAADJOUL', 'AHMED', 'C/MAITRE MESURES N2', 'ENP', 'INAS - TOUS LES CHAMPS INAS', 'MESURES & CONTRÔLE'),
    ('60237E', 'BOUZAHRI', 'ABDELOUAHAB', 'CHEF SECTION WORKOVER N2', 'ENP', 'INAS - TOUS LES CHAMPS INAS', 'PUITS'),
    ('37040T', 'BRIHMAT', 'ABDALLAH', 'ING  GEOLOGUE N2', 'ENP', 'INAS - TOUS LES CHAMPS INAS', 'RESERVOIR'),
    ('15180Q', 'CHAICH', 'EDDINE', 'CONTRE MAITRE PREPARATION N2', 'ENP', 'INAS - TOUS LES CHAMPS INAS', 'PUITS'),
    ('37046G', 'CHAIEB', 'MOHAMMED', 'ING  GEOLOGUE N2', 'ENP', 'INAS - TOUS LES CHAMPS INAS', 'GEOLOGIE'),
    ('32759R', 'CHALA', 'MOURAD', 'TECHNICEN MESURES PPL', 'ENP', 'INAS - TOUS LES CHAMPS INAS', 'MESURES & CONTRÔLE'),
    ('15192Y', 'CHEKAIEM', 'MEHREZ', 'TECHNICEN MESURES PPL', 'ENP', 'INAS - TOUS LES CHAMPS INAS', 'MESURES & CONTRÔLE'),
    ('50350W', 'CHERGUI', 'SALIM', 'CHEF SECTION WIRE LINE N2', 'ENP', 'INAS - TOUS LES CHAMPS INAS', 'PUITS'),
    ('40475Q', 'DERKAOUI', 'HOUARI', 'ING MSP PRODUCTION N1', 'ENP', 'INAS - TOUS LES CHAMPS INAS', 'TECHNIQUES PUITS'),
    ('32758P', 'DJEMAI', 'BILAL', 'TECHNICIEN MESURES PPL', 'ENP', 'INAS - TOUS LES CHAMPS INAS', 'MESURES & CONTRÔLE'),
    ('15178D', 'GADI', 'YOUCEF', 'CHEF SECTION MESURES N1', 'ENP', 'INAS - TOUS LES CHAMPS INAS', 'MESURES & CONTRÔLE'),
    ('37071J', 'GHERAIBIA', 'SOFIANE', 'TECHNICIEN GEOLOGUE N4', 'ENP', 'INAS - TOUS LES CHAMPS INAS', 'GEOLOGIE'),
    ('15184Y', 'GUERAT', 'ALI', 'TECHNICIEN MESURES PPL', 'ENP', 'INAS - TOUS LES CHAMPS INAS', 'MESURES & CONTRÔLE'),
    ('15185B', 'HACHOUD', 'MESSAOUD', 'C/MAITRE WORK OVER N2', 'ENP', 'INAS - TOUS LES CHAMPS INAS', 'PUITS'),
    ('59679H', 'HADJAB', 'KHIRREDDINE', 'CHEF SERVICE RESERVOIR', 'ENP', 'INAS - TOUS LES CHAMPS INAS', 'RESERVOIR'),
    ('71468P', 'HAMAIDI', 'MOHAMED ZAKARIA', 'TECHNICIEN PUITS PPL', 'ENP', 'INAS - TOUS LES CHAMPS INAS', 'PUITS'),
    ('89818B', 'HASHAS', 'OMAR', 'ING GEOLOGUE N3', 'ENP', 'INAS - TOUS LES CHAMPS INAS', 'GEOLOGIE'),
    ('74956B', 'KEBAILI', 'CHERIF', 'OPERATEUR PUITS N2', 'ENP', 'INAS - TOUS LES CHAMPS INAS', 'PUITS'),
    ('32754F', 'KERMICHE', 'ZINE EDDINE', 'C/MAITRE WORK OVER N2', 'ENP', 'INAS - TOUS LES CHAMPS INAS', 'PUITS'),
    ('55634K', 'KHEFFACH', 'MOHAMED', 'C/MAITRE PUITS N2', 'ENP', 'INAS - TOUS LES CHAMPS INAS', 'PUITS'),
    ('32760B', 'KHELILE', 'ABDELHAK', 'TECHNICIEN PREPARATION PPL', 'ENP', 'INAS - TOUS LES CHAMPS INAS', 'PUITS'),
    ('34540K', 'LAAMECHE', 'ANWAR', 'ING RESERVOIR N1', 'ENP', 'INAS - TOUS LES CHAMPS INAS', 'RESERVOIR'),
    ('15846W', 'MADACI', 'SEYF EDDINE', 'CHEF SERVICE MESURES & CONTRÔLE', 'ENP', 'INAS - TOUS LES CHAMPS INAS', 'MESURES & CONTRÔLE'),
    ('60285W', 'MAHROUG ERRAS', 'SAF EDDINE', 'CHEF SERVICE PUITS', 'ENP', 'INAS - TOUS LES CHAMPS INAS', 'PUITS'),
    ('33408J', 'MEFTAH', 'AHCEN', 'TECHNICIEN WORK OVER PPL', 'ENP', 'INAS - TOUS LES CHAMPS INAS', 'PUITS'),
    ('37050X', 'MENDI', 'BOUMEDYEN', 'ING GEOPHYSIQUE N2', 'ENP', 'INAS - TOUS LES CHAMPS INAS', 'TECHNIQUES PUITS'),
    ('65229R', 'MERAH', 'AYMEN', 'TECHNICIEN PRODUCTION N5', 'ENP', 'INAS - TOUS LES CHAMPS INAS', 'MESURES & CONTRÔLE'),
    ('32587H', 'MOUISSA', 'BELKACEM', 'SUPERVISEUR OPERATIONS N 1', 'ENP', 'INAS - TOUS LES CHAMPS INAS', 'PUITS'),
    ('65246T', 'NAILI', 'HAMZA', 'TECHNICIEN PRODUCTION N5', 'ENP', 'INAS - TOUS LES CHAMPS INAS', 'MESURES & CONTRÔLE'),
    ('60790J', 'OULEDHAIMOUDA', 'ABDELHALIM', 'SECRETAIRE N1', 'ENP', 'INAS - TOUS LES CHAMPS INAS', 'DIVISION'),
    ('08326M', 'REGHIS', 'HOUAS', 'CHEF SECTION PREPARATION N1 (GIS)', 'ENP', 'INAS - TOUS LES CHAMPS INAS', 'PUITS'),
    ('60923C', 'RIGUET', 'BENHOUILI', 'C/MAITRE WIRE LINE N2', 'ENP', 'INAS - TOUS LES CHAMPS INAS', 'PUITS'),
    ('08334M', 'SABRI', 'MOHAMED', 'CHEF SECTION MESURES N1', 'ENP', 'INAS - TOUS LES CHAMPS INAS', 'MESURES & CONTRÔLE'),
    ('32589M', 'SADKI', 'ALI', 'SUPERVISEUR OPERATIONS N 2', 'ENP', 'INAS - TOUS LES CHAMPS INAS', 'MESURES & CONTRÔLE'),
    ('37045E', 'SELMANIA', 'TAWFIQ', 'ING GEOLOGUE N1', 'ENP', 'INAS - TOUS LES CHAMPS INAS', 'GEOLOGIE'),
    ('91266M', 'SLIMI BOULERBAH', 'BOULERBAH', 'GEOLOGUE DE SONDE PPL', 'ENP', 'INAS - TOUS LES CHAMPS INAS', 'GEOLOGIE'),
    ('32777V', 'SOUISSI', 'KAMEL', 'SUPERVISEUR OPERATIONS N 1', 'ENP', 'INAS - TOUS LES CHAMPS INAS', 'PUITS'),
    ('32757M', 'TALBI', 'CHOUAIB', 'TECHNICIEN WORK OVER PPL', 'ENP', 'INAS - TOUS LES CHAMPS INAS', 'PUITS'),
    ('37022P', 'TOUMIAT', 'YASSINE ABDELDJALIL', 'ING RESERVOIR N2', 'ENP', 'INAS - TOUS LES CHAMPS INAS', 'PUITS'),
    ('41035F', 'ZEROUKHI', 'DJOUHER', 'ING RESERVOIR N1', 'ENP', 'INAS - TOUS LES CHAMPS INAS', 'RESERVOIR')
]

async def populate_employees():
    # Clear existing employees
    await db.employees.delete_many({})
    
    # Insert new employee data
    employees_to_insert = []
    for matricule, full_name, full_name1, job_title, division, itineraire, service in employees_data:
        employee = {
            "matricule": matricule,
            "full_name": full_name,
            "full_name1": full_name1,
            "job_title": job_title,
            "division": division,
            "itineraire": itineraire,
            "service": service
        }
        employees_to_insert.append(employee)
    
    await db.employees.insert_many(employees_to_insert)
    print(f"Inserted {len(employees_to_insert)} employees into the database")
    client.close()

if __name__ == "__main__":
    asyncio.run(populate_employees())
