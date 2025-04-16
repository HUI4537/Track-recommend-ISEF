import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from sentence_transformers import SentenceTransformer

class PlaceRecommender:
    def __init__(self, user_profiles, user_place_matrix, num_latent_features=2, learning_rate=0.01, num_epochs=1000):
        # 유저 프로필과 유저-장소 매트릭스 초기화
        self.user_profiles = user_profiles
        self.user_place_matrix = user_place_matrix
        self.num_latent_features = num_latent_features  # 잠재 요인 개수 설정
        self.learning_rate = learning_rate  # 학습률 설정
        self.num_epochs = num_epochs  # 학습 반복 횟수 설정
        self.text_embedding_model = SentenceTransformer('paraphrase-MiniLM-L6-v2')  # 문장 임베딩 모델 로드

        # 행렬 분해를 위한 잠재 요인 초기화
        np.random.seed(0)  # 무작위 시드 설정
        self.user_latent_factors = {user_id: np.random.normal(scale=1.0 / num_latent_features, size=(num_latent_features,))
                            for user_id in user_profiles}  # 각 유저의 잠재 요인 초기화
        self.place_latent_factors = {place_id: np.random.normal(scale=1.0 / num_latent_features, size=(num_latent_features,))
                            for place_id in range(self._get_num_places())}  # 각 장소의 잠재 요인 초기화

        # SGD를 이용하여 행렬 분해 수행
        self._train_matrix_factorization()

    def _get_num_places(self):
        # 장소의 총 개수 계산 (매트릭스 크기 설정에 사용)
        return max(place_id for visits in self.user_place_matrix.values() for place_id in visits) + 1

    def _train_matrix_factorization(self):
        # SGD를 사용하여 유저와 장소의 잠재 요인을 학습
        for epoch in range(self.num_epochs):
            for user_id, visited_places in self.user_place_matrix.items():
                for place_id, rating in visited_places.items():
                    prediction_error = rating - np.dot(self.user_latent_factors[user_id], self.place_latent_factors[place_id])  # 예측 오차 계산
                    # 오차 기반으로 유저 및 장소 잠재 요인 업데이트
                    self.user_latent_factors[user_id] += self.learning_rate * prediction_error * self.place_latent_factors[place_id]
                    self.place_latent_factors[place_id] += self.learning_rate * prediction_error * self.user_latent_factors[user_id]

    def _compute_text_similarity(self, new_text, existing_texts):
        # 새 텍스트와 기존 텍스트들 간의 코사인 유사도 계산
        new_text_embedding = self.text_embedding_model.encode(new_text)  # 새 텍스트 임베딩 생성
        text_similarities = {}
        for user_id, existing_text in existing_texts.items():
            existing_text_embedding = self.text_embedding_model.encode(existing_text)  # 기존 텍스트 임베딩 생성
            similarity_score = cosine_similarity([new_text_embedding], [existing_text_embedding])[0][0]  # 유사도 계산
            text_similarities[user_id] = similarity_score  # 유사도 저장
        return text_similarities

    def _compute_profile_similarity(self, new_user_profile):
        # 새로운 유저 프로필과 기존 유저 프로필들 간의 유사도 계산
        profile_vectors = []  # 프로필 벡터 리스트
        user_ids = []  # 유저 ID 리스트
        for user_id, profile in self.user_profiles.items():
            profile_vector = [int(new_user_profile[key] == profile[key]) for key in ['age_range', 'gender', 'nationality']]  # 유사도 벡터 생성
            profile_vectors.append(profile_vector)
            user_ids.append(user_id)
        profile_similarity_scores = cosine_similarity([[1,1,1]], profile_vectors)[0]  # 코사인 유사도로 프로필 유사도 계산

        # travel_pref와 food_pref의 유사도 계산
        travel_preference_similarity = self._compute_text_similarity(new_user_profile['travel_pref'],
                                                               {user_id: profile['travel_pref'] for user_id, profile in self.user_profiles.items()})
        food_preference_similarity = self._compute_text_similarity(new_user_profile['food_pref'],
                                                             {user_id: profile['food_pref'] for user_id, profile in self.user_profiles.items()})

        # 유사도를 가중치로 결합 (travel_pref와 food_pref는 각각 0.3, 나머지는 0.4로 설정)
        combined_similarity_scores = {user_id: profile_similarity_scores[idx] * 0.4 + travel_preference_similarity[user_id] * 0.3 + food_preference_similarity[user_id] * 0.3
                               for idx, user_id in enumerate(user_ids)}
        return combined_similarity_scores

    def place_recommend(self, new_user_profile, num_recommendations=10):
        # 새로운 유저 프로필과 기존 유저들 간의 유사도 점수 계산
        user_similarity_scores = self._compute_profile_similarity(new_user_profile)

        # 비슷한 유저들의 선호도를 기반으로 장소별 예상 평점 계산
        predicted_place_ratings = {place_id: 0 for place_id in self.place_latent_factors}
        for user_id, similarity_score in user_similarity_scores.items():
            for place_id, rating in self.user_place_matrix.get(user_id, {}).items():
                predicted_place_ratings[place_id] += similarity_score * np.dot(self.user_latent_factors[user_id], self.place_latent_factors[place_id])  # 예상 평점 계산

        # 예상 평점 순으로 정렬하여 상위 n개의 장소 추천
        recommended_place_ids = sorted(predicted_place_ratings, key=predicted_place_ratings.get, reverse=True)
        return recommended_place_ids[:num_recommendations]  # 추천 장소 반환