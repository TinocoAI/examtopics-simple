/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Exam } from "../types";

export const SAMPLE_EXAMS: Exam[] = [
  {
    id: "aws-saa-c03",
    name: "AWS Certified Solutions Architect - Associate",
    code: "SAA-C03",
    provider: "Amazon Web Services",
    questions: [
      {
        id: "aws-saa-c03-q1",
        number: 1,
        text: "A company wants to migrate an on-premises database to AWS. The database contains highly confidential information, and the migration must ensure the highest level of security. The on-premises database is 20 TB in size. The network link to AWS is a shared 100 Mbps internet connection. Which solution meets these requirements with the lowest cost and fastest transfer time?",
        options: [
          "A. Set up an AWS Direct Connect connection and transfer the database directly into AWS using AWS Database Migration Service (AWS DMS).",
          "B. Use an AWS Snowball Edge Storage Optimized device to copy and securely ship the database backup to AWS, then restore it in Amazon RDS.",
          "C. Compress the database files, encrypt them, and upload them to Amazon S3 over the shared internet connection using multi-part upload, then restore in Amazon RDS.",
          "D. Set up an IPsec VPN over the internet, and transfer the data directly to an EC2 instance running the database database."
        ],
        correctAnswer: ["B"],
        communityAnswer: "B (100% voted)",
        communityVotes: { "B": 100 },
        discussion: [
          {
            id: "aws-q1-c1",
            username: "CloudNinja99",
            date: "3 months ago",
            vote: "B",
            content: "Definitely B. With a 100 Mbps internet connection, uploading 20 TB of encrypted data would take approximately 18-20 days under perfect conditions, which is highly impractical and shares bandwidth with other company services. Snowball is the standard solution for offline transfers above 10 TB.",
            upvotes: 42
          },
          {
            id: "aws-q1-c2",
            username: "CertChaser",
            date: "2 months ago",
            vote: "B",
            content: "Agreed. S3 multi-part (Option C) over 100 Mbps is too slow. Direct Connect (Option A) has high setup time (takes weeks) and is expensive for a one-off migration.",
            upvotes: 15
          }
        ]
      },
      {
        id: "aws-saa-c03-q2",
        number: 2,
        text: "A web application runs on Amazon EC2 instances behind an Application Load Balancer (ALB). The application displays user profiles that contain images hosted on Amazon S3. Users are complaining that the images are loading slowly. Which solution will improve image loading times with the least administrative effort?",
        options: [
          "A. Configure Amazon CloudFront with the S3 bucket as an origin. Update the application to serve images via the CloudFront URL.",
          "B. Enable S3 Transfer Acceleration on the S3 bucket to speed up the delivery of images to users globally.",
          "C. Set up an AWS Global Accelerator in front of the Application Load Balancer to route traffic to the nearest S3 bucket.",
          "D. Re-architect the application to store image files directly on EC2 instance store volumes and enable clustering."
        ],
        correctAnswer: ["A"],
        communityAnswer: "A (97% voted)",
        communityVotes: { "A": 97, "B": 3 },
        discussion: [
          {
            id: "aws-q2-c1",
            username: "S3Pro",
            date: "1 month ago",
            vote: "A",
            content: "Amazon CloudFront is the CDN designed exactly for caching S3 static assets close to users, dramatically decreasing latency with minimum effort. S3 Transfer Acceleration is for speeding up UPLOADS (PUT), not downloads.",
            upvotes: 68
          },
          {
            id: "aws-q2-c2",
            username: "AWS_Arch",
            date: "2 weeks ago",
            vote: "A",
            content: "Yes, Option A is standard practice. Global Accelerator is for TCP/UDP routing using AWS edge infrastructure, but doesn't cache assets like images.",
            upvotes: 21
          }
        ]
      },
      {
        id: "aws-saa-c03-q3",
        number: 3,
        text: "A company needs to store archived compliance logs that must be kept for 7 years. The logs are accessed very rarely (usually once or twice a year), but when access is requested, the logs must be available within a few minutes. Which storage option is the most cost-effective?",
        options: [
          "A. Amazon S3 Standard-Infrequent Access (S3 Standard-IA)",
          "B. Amazon S3 Glacier Instant Retrieval",
          "C. Amazon S3 Glacier Flexible Retrieval (formerly Glacier)",
          "D. Amazon S3 Glacier Deep Archive"
        ],
        correctAnswer: ["B"],
        communityAnswer: "B (84% voted)",
        communityVotes: { "B": 84, "C": 16 },
        discussion: [
          {
            id: "aws-q3-c1",
            username: "AwsGeek",
            date: "4 months ago",
            vote: "B",
            content: "Glacier Instant Retrieval is perfect here. It has the same low cost as archive storage, but retrieves data in milliseconds. Perfect for rare access that needs to be quick (within minutes). Glacier Flexible takes 1 to 5 hours (unless paying for expedited, which is expensive), and Deep Archive takes up to 12 hours.",
            upvotes: 53
          },
          {
            id: "aws-q3-c2",
            username: "StudyHarder",
            date: "3 months ago",
            vote: "C",
            content: "Wait, the question says 'within a few minutes'. Glacier Flexible Retrieval expedited retrieval takes 1-5 minutes! But it is more expensive than Instant Retrieval for retrievals. Since Instant Retrieval is designed exactly for this use case, B is standard and cheaper overall.",
            upvotes: 11
          }
        ]
      }
    ]
  },
  {
    id: "gcp-pca",
    name: "Google Cloud Certified Professional Cloud Architect",
    code: "PCA",
    provider: "Google Cloud",
    questions: [
      {
        id: "gcp-pca-q1",
        number: 1,
        text: "You are designing a globally distributed transactional database for a financial services company. The database must support high-throughput ACID transactions, guarantee strong consistency, and scale horizontally across multiple continents. Which Google Cloud storage solution should you choose?",
        options: [
          "A. Cloud SQL with read replicas in multiple regions",
          "B. Cloud Spanner with a multi-region configuration",
          "C. Cloud Bigtable with multi-cluster replication",
          "D. Firestore with multi-region setting"
        ],
        correctAnswer: ["B"],
        communityAnswer: "B (100% voted)",
        communityVotes: { "B": 100 },
        discussion: [
          {
            id: "gcp-q1-c1",
            username: "GcpAce",
            date: "5 months ago",
            vote: "B",
            content: "Cloud Spanner is Google's flagship relational database offering that scales horizontally globally while maintaining strict ACID compliance and strong global consistency. Cloud SQL (Option A) only supports horizontal scaling via read replicas, which are asynchronously replicated (eventual consistency only).",
            upvotes: 39
          },
          {
            id: "gcp-q1-c2",
            username: "DataGuru",
            date: "2 months ago",
            vote: "B",
            content: "Bigtable (Option C) is NoSQL and does not support multi-row ACID transactions globally with strong consistency. Spanner is the absolute correct choice.",
            upvotes: 18
          }
        ]
      },
      {
        id: "gcp-pca-q2",
        number: 2,
        text: "A marketing company queries a 100 TB BigQuery table daily to analyze campaign metrics. The queries filter data by a specific country and date range. The company is concerned about rising query costs. Which strategy will reduce BigQuery query costs with the least architectural changes?",
        options: [
          "A. Export the BigQuery table to Cloud Storage as CSV files and use Cloud Dataproc to process queries.",
          "B. Partition the table by date and cluster the table by country.",
          "C. Split the table into 100 smaller tables, one for each country, and run queries against individual tables.",
          "D. Configure BigQuery BI Engine to cache all query results in memory."
        ],
        correctAnswer: ["B"],
        communityAnswer: "B (94% voted)",
        communityVotes: { "B": 94, "D": 6 },
        discussion: [
          {
            id: "gcp-q2-c1",
            username: "BigQueryWhiz",
            date: "3 months ago",
            vote: "B",
            content: "By partitioning by date, BigQuery will only scan slots/data within that date range. By clustering by country, data is sorted and stored together, reducing the byte scan size significantly when filtering. Both lower query costs directly.",
            upvotes: 57
          },
          {
            id: "gcp-q2-c2",
            username: "GoCloud",
            date: "1 month ago",
            vote: "B",
            content: "BI Engine is great for speed, but for a 100 TB table, caching everything in memory is extremely expensive or impossible. Partitioning + Clustering is the recommended best practice for BigQuery cost optimization.",
            upvotes: 14
          }
        ]
      }
    ]
  },
  {
    id: "ms-az-900",
    name: "Microsoft Azure Fundamentals",
    code: "AZ-900",
    provider: "Microsoft Azure",
    questions: [
      {
        id: "ms-az-900-q1",
        number: 1,
        text: "A company plans to deploy several web servers and databases to Azure. The company requires a cloud service model where Microsoft manages the operating system, server hardware, virtualization, and runtime environment, while the company only manages the application code and configuration. Which cloud service model meets these requirements?",
        options: [
          "A. Infrastructure as a Service (IaaS)",
          "B. Platform as a Service (PaaS)",
          "C. Software as a Service (SaaS)",
          "D. Function as a Service (FaaS)"
        ],
        correctAnswer: ["B"],
        communityAnswer: "B (100% voted)",
        communityVotes: { "B": 100 },
        discussion: [
          {
            id: "ms-q1-c1",
            username: "AzureExpert",
            date: "6 months ago",
            vote: "B",
            content: "This is the classic textbook definition of PaaS (Platform as a Service). The cloud provider manages the platform (OS, middleware, runtime), and the developer just deploys their code (e.g. Azure App Services, Azure SQL Database).",
            upvotes: 31
          },
          {
            id: "ms-q1-c2",
            username: "CertMaster",
            date: "4 months ago",
            vote: "B",
            content: "IaaS (Option A) requires you to manage the OS (updates, patches). SaaS (Option C) is a complete finished application like Microsoft 365 where you don't even manage application code.",
            upvotes: 19
          }
        ]
      }
    ]
  }
];
